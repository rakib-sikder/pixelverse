/**
 * Pure size arithmetic for the transform stage.
 *
 * Kept free of canvas and DOM so the fiddly parts — aspect ratios, `cover`
 * cropping, the "don't enlarge" guard — can be tested directly. `ops.ts` does
 * the actual pixel pushing using the plans produced here.
 */

import type { CropRect, ResizeSpec } from "./types";

export interface ResizePlan {
  /** Final output dimensions, always at least 1×1. */
  width: number;
  height: number;
  /**
   * Region of the (already rotated) source to sample from.
   * `null` means the whole image. Only `cover` produces a crop.
   */
  sourceCrop: CropRect | null;
}

function atLeastOne(value: number): number {
  return Math.max(1, Math.round(value));
}

/** Swaps width and height for the quarter turns. */
export function rotatedSize(
  width: number,
  height: number,
  rotate: 0 | 90 | 180 | 270,
): { width: number; height: number } {
  return rotate === 90 || rotate === 270 ? { width: height, height: width } : { width, height };
}

/**
 * Works out the output size for a source of `width`×`height`.
 * A `null` spec, or one that resolves to no change, returns the source size.
 */
export function planResize(width: number, height: number, spec: ResizeSpec | null): ResizePlan {
  const unchanged: ResizePlan = { width, height, sourceCrop: null };
  if (!spec) return unchanged;

  if (spec.mode === "percent") {
    const percent = spec.noEnlarge ? Math.min(spec.percent, 100) : spec.percent;
    if (percent <= 0) return unchanged;
    return {
      width: atLeastOne((width * percent) / 100),
      height: atLeastOne((height * percent) / 100),
      sourceCrop: null,
    };
  }

  const wantWidth = spec.width && spec.width > 0 ? spec.width : null;
  const wantHeight = spec.height && spec.height > 0 ? spec.height : null;

  if (wantWidth === null && wantHeight === null) return unchanged;

  // One axis given: the other follows from the aspect ratio, whatever the fit.
  if (wantWidth === null || wantHeight === null) {
    const scale = wantWidth !== null ? wantWidth / width : wantHeight! / height;
    const capped = spec.noEnlarge ? Math.min(scale, 1) : scale;
    return {
      width: atLeastOne(width * capped),
      height: atLeastOne(height * capped),
      sourceCrop: null,
    };
  }

  if (spec.fit === "fill") {
    // Aspect ratio is deliberately not preserved.
    const w = spec.noEnlarge ? Math.min(wantWidth, width) : wantWidth;
    const h = spec.noEnlarge ? Math.min(wantHeight, height) : wantHeight;
    return { width: atLeastOne(w), height: atLeastOne(h), sourceCrop: null };
  }

  if (spec.fit === "contain") {
    const scale = Math.min(wantWidth / width, wantHeight / height);
    const capped = spec.noEnlarge ? Math.min(scale, 1) : scale;
    return {
      width: atLeastOne(width * capped),
      height: atLeastOne(height * capped),
      sourceCrop: null,
    };
  }

  // cover: fill the box exactly, trimming the overhanging axis from the source
  // so nothing is stretched.
  let outWidth = wantWidth;
  let outHeight = wantHeight;
  if (spec.noEnlarge) {
    const shrink = Math.min(1, width / wantWidth, height / wantHeight);
    outWidth = atLeastOne(wantWidth * shrink);
    outHeight = atLeastOne(wantHeight * shrink);
  }

  return {
    width: atLeastOne(outWidth),
    height: atLeastOne(outHeight),
    sourceCrop: centeredCrop(width, height, outWidth / outHeight),
  };
}

/**
 * The largest centred rectangle inside `width`×`height` with the given aspect
 * ratio — the source region a `cover` resize samples.
 */
export function centeredCrop(width: number, height: number, aspect: number): CropRect {
  const sourceAspect = width / height;
  if (Math.abs(sourceAspect - aspect) < 1e-6) {
    return { x: 0, y: 0, width, height };
  }

  if (sourceAspect > aspect) {
    // Source is too wide: trim the sides.
    const cropWidth = atLeastOne(height * aspect);
    return { x: Math.round((width - cropWidth) / 2), y: 0, width: cropWidth, height };
  }

  // Source is too tall: trim top and bottom.
  const cropHeight = atLeastOne(width / aspect);
  return { x: 0, y: Math.round((height - cropHeight) / 2), width, height: cropHeight };
}

/**
 * Clamps a user-supplied crop to the image, returning `null` if it covers the
 * whole thing (so the caller can skip the pass) or if nothing is left.
 */
export function normalizeCrop(
  width: number,
  height: number,
  crop: CropRect | null,
): CropRect | null {
  if (!crop) return null;

  const x = Math.max(0, Math.min(Math.round(crop.x), width - 1));
  const y = Math.max(0, Math.min(Math.round(crop.y), height - 1));
  const w = Math.max(1, Math.min(Math.round(crop.width), width - x));
  const h = Math.max(1, Math.min(Math.round(crop.height), height - y));

  if (x === 0 && y === 0 && w === width && h === height) return null;
  return { x, y, width: w, height: h };
}
