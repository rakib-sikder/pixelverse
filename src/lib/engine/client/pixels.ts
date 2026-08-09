/**
 * Pixel maths with no canvas and no DOM.
 *
 * `ImageData` satisfies the `Pixels` shape structurally, so the worker passes
 * its `ImageData` straight into these functions. Keeping them DOM-free means
 * the colour arithmetic — the part that silently produces wrong-looking images
 * rather than throwing — is unit-testable in plain Node.
 */

import type { CropRect, FilterSpec } from "../types";

export interface Pixels {
  /**
   * Explicitly backed by an `ArrayBuffer`, not the default `ArrayBufferLike`.
   * `ImageData` requires a non-shared buffer, so leaving this generic makes
   * every `new ImageData(pixels.data, ...)` a type error.
   */
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

/** Rec. 709 luma weights, matching what CSS `grayscale()` uses. */
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses `#rgb`, `#rrggbb`, or the same without the hash.
 * Falls back to white, which is the least destructive background for a
 * transparent image flattened into JPEG.
 */
export function parseHexColor(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }

  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  return { r: 255, g: 255, b: 255 };
}

/** Copies a rectangle out, row by row. Assumes the rect is already clamped. */
export function cropPixels(image: Pixels, rect: CropRect): Pixels {
  const out = new Uint8ClampedArray(rect.width * rect.height * 4);
  const rowBytes = rect.width * 4;

  for (let row = 0; row < rect.height; row++) {
    const from = ((rect.y + row) * image.width + rect.x) * 4;
    out.set(image.data.subarray(from, from + rowBytes), row * rowBytes);
  }

  return { data: out, width: rect.width, height: rect.height };
}

/**
 * Composites the image over an opaque background and drops the alpha channel.
 *
 * Without this, every transparent pixel becomes black the moment it reaches a
 * format with no alpha — the single most common surprise when converting a
 * logo PNG to JPEG.
 */
export function flattenOnto(image: Pixels, background: Rgb): Pixels {
  const data = new Uint8ClampedArray(image.data);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha === 1) continue;

    data[i] = data[i] * alpha + background.r * (1 - alpha);
    data[i + 1] = data[i + 1] * alpha + background.g * (1 - alpha);
    data[i + 2] = data[i + 2] * alpha + background.b * (1 - alpha);
    data[i + 3] = 255;
  }

  return { data, width: image.width, height: image.height };
}

/** True when the colour pass would change nothing, so it can be skipped. */
export function needsColorPass(f: FilterSpec): boolean {
  return (
    f.brightness !== 100 ||
    f.contrast !== 100 ||
    f.saturation !== 100 ||
    f.grayscale !== 0 ||
    f.sepia !== 0
  );
}

/**
 * Brightness, contrast, saturation, grayscale and sepia in one pass.
 *
 * Applied in that order, matching the CSS `filter` shorthand so a live preview
 * built from CSS and the real encode agree.
 */
export function applyColorFilters(image: Pixels, f: FilterSpec): Pixels {
  const data = new Uint8ClampedArray(image.data);

  const brightness = f.brightness / 100;
  const contrast = f.contrast / 100;
  const saturation = f.saturation / 100;
  const gray = f.grayscale / 100;
  const sepia = f.sepia / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * brightness;
    let g = data[i + 1] * brightness;
    let b = data[i + 2] * brightness;

    if (contrast !== 1) {
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
    }

    if (saturation !== 1) {
      const luma = LUMA_R * r + LUMA_G * g + LUMA_B * b;
      r = luma + (r - luma) * saturation;
      g = luma + (g - luma) * saturation;
      b = luma + (b - luma) * saturation;
    }

    if (gray > 0) {
      const luma = LUMA_R * r + LUMA_G * g + LUMA_B * b;
      r += (luma - r) * gray;
      g += (luma - g) * gray;
      b += (luma - b) * gray;
    }

    if (sepia > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r += (sr - r) * sepia;
      g += (sg - g) * sepia;
      b += (sb - b) * sepia;
    }

    // Uint8ClampedArray handles the 0–255 clamping on assignment.
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return { data, width: image.width, height: image.height };
}

/**
 * Unsharp mask via a 3×3 kernel, blended toward identity by `amount` (0–1).
 *
 * Edge pixels clamp to the nearest in-bounds sample rather than wrapping, so
 * borders do not pick up colour from the opposite side of the image.
 */
export function sharpenPixels(image: Pixels, amount: number): Pixels {
  if (amount <= 0) return image;

  const strength = Math.min(1, amount);
  // Identity blended with a Laplacian sharpen kernel.
  const centre = 1 + 4 * strength;
  const side = -strength;

  const { width, height, data } = image;
  const out = new Uint8ClampedArray(data.length);

  const sampleAt = (x: number, y: number, channel: number): number => {
    const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
    const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
    return data[(cy * width + cx) * 4 + channel];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        const value =
          sampleAt(x, y, channel) * centre +
          (sampleAt(x - 1, y, channel) +
            sampleAt(x + 1, y, channel) +
            sampleAt(x, y - 1, channel) +
            sampleAt(x, y + 1, channel)) *
            side;
        out[index + channel] = value;
      }

      out[index + 3] = data[index + 3];
    }
  }

  return { data: out, width, height };
}

/** True when every pixel is fully opaque — used to skip pointless flattening. */
export function isOpaque(image: Pixels): boolean {
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] !== 255) return false;
  }
  return true;
}
