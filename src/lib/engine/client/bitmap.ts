/**
 * Main-thread decoding for the formats the browser already reads.
 *
 * BMP, GIF and ICO could mostly be done with `createImageBitmap` inside the
 * worker, but SVG cannot — Chrome refuses to rasterise SVG through
 * `createImageBitmap` at all, and it needs a real `<img>` element. Rather than
 * split the rule across two places, everything in this group is decoded here on
 * the main thread and handed to the worker as raw pixels.
 *
 * These decodes are cheap; they are the browser's own native code paths.
 */

import type { RawPixels } from "../types";

/**
 * SVGs are resolution-independent, so there is no single "correct" raster size.
 * Below this, small icons rasterise visibly soft, so we scale up before
 * drawing — a vector redraw costs nothing in quality, unlike upscaling pixels.
 */
const SVG_MIN_RASTER = 1024;
/** Hard ceiling so a viewBox of 100000 cannot allocate gigabytes. */
const SVG_MAX_RASTER = 8192;

function drawToPixels(
  source: CanvasImageSource,
  width: number,
  height: number,
): RawPixels {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser would not provide a 2D canvas context.");

  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);

  // `.buffer` is an ArrayBuffer we own outright, so it can be transferred to
  // the worker rather than copied.
  return { data: image.data.buffer as ArrayBuffer, width, height };
}

async function decodeSvg(blob: Blob): Promise<RawPixels> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    // An SVG with only a viewBox and no width/height reports 0 here.
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (!width || !height) {
      width = SVG_MIN_RASTER;
      height = SVG_MIN_RASTER;
    }

    const longest = Math.max(width, height);
    let scale = 1;
    if (longest < SVG_MIN_RASTER) scale = SVG_MIN_RASTER / longest;
    if (longest * scale > SVG_MAX_RASTER) scale = SVG_MAX_RASTER / longest;

    return drawToPixels(img, Math.round(width * scale), Math.round(height * scale));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeRaster(blob: Blob): Promise<RawPixels> {
  const bitmap = await createImageBitmap(blob);
  try {
    return drawToPixels(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/**
 * Decodes a blob using the browser's own image support.
 * `isSvg` picks the `<img>` path, which is the only one SVG works with.
 */
export async function decodeWithBrowser(blob: Blob, isSvg: boolean): Promise<RawPixels> {
  return isSvg ? decodeSvg(blob) : decodeRaster(blob);
}
