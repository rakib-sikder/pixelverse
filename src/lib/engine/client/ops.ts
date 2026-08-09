/**
 * The transform stage, run inside the worker.
 *
 * Order is fixed: crop → rotate → flip → resize → flatten → filters → watermark.
 * Cropping first keeps crop coordinates in source pixels; watermarking last
 * means the mark is never resampled or blurred by a later stage.
 *
 * The arithmetic lives in `pixels.ts` and `geometry.ts`; this file only handles
 * the steps that genuinely need a canvas (rotation, blur, text).
 */

import resizeImage from "@jsquash/resize";
import { normalizeCrop, planResize, rotatedSize } from "../geometry";
import { filtersAreNeutral, type FilterSpec, type ImageOps, type WatermarkSpec } from "../types";
import {
  applyColorFilters,
  cropPixels,
  flattenOnto,
  isOpaque,
  needsColorPass,
  parseHexColor,
  sharpenPixels,
  type Pixels,
} from "./pixels";

/** Re-wraps a plain `Pixels` as a real `ImageData` for the codecs. */
function toImageData(pixels: Pixels): ImageData {
  if (pixels instanceof ImageData) return pixels;
  return new ImageData(pixels.data, pixels.width, pixels.height);
}

function canvasFrom(image: Pixels): OffscreenCanvas {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context in the worker.");
  ctx.putImageData(toImageData(image), 0, 0);
  return canvas;
}

function readBack(canvas: OffscreenCanvas): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context in the worker.");
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Applies rotation and flips in one canvas pass.
 *
 * The transform order below is deliberate. Canvas applies transforms so the
 * last one declared is innermost, so declaring scale *before* rotate makes the
 * rotation happen first — matching the documented crop → rotate → flip order.
 * Declaring them the other way round silently produces a mirrored result for
 * the quarter turns.
 */
function orient(image: Pixels, rotate: 0 | 90 | 180 | 270, flipH: boolean, flipV: boolean) {
  const { width, height } = rotatedSize(image.width, image.height, rotate);
  const source = canvasFrom(image);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context in the worker.");

  ctx.translate(width / 2, height / 2);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(source, -image.width / 2, -image.height / 2);

  return readBack(canvas);
}

/** Gaussian blur, which is impractical to hand-roll at any useful speed. */
function blur(image: Pixels, radius: number): ImageData {
  const source = canvasFrom(image);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context in the worker.");

  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(source, 0, 0);
  return readBack(canvas);
}

function drawWatermark(image: Pixels, mark: WatermarkSpec): ImageData {
  const canvas = canvasFrom(image);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context in the worker.");

  // Sizing off the shorter side keeps the mark proportionate whether the
  // output is a wide banner or a tall portrait.
  const minSide = Math.min(image.width, image.height);
  const fontSize = Math.max(8, Math.round(minSide * mark.sizeRatio));
  const margin = Math.round(minSide * mark.marginRatio);

  const [vertical, horizontal] = mark.position.split("-");

  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.globalAlpha = Math.max(0, Math.min(1, mark.opacity));
  ctx.fillStyle = mark.color;
  ctx.textAlign = horizontal === "left" ? "left" : horizontal === "right" ? "right" : "center";
  ctx.textBaseline = vertical === "top" ? "top" : vertical === "bottom" ? "bottom" : "middle";

  const x =
    horizontal === "left" ? margin : horizontal === "right" ? image.width - margin : image.width / 2;
  const y =
    vertical === "top" ? margin : vertical === "bottom" ? image.height - margin : image.height / 2;

  ctx.fillText(mark.text, x, y);
  return readBack(canvas);
}

async function applyFilters(image: Pixels, filters: FilterSpec): Promise<Pixels> {
  let current: Pixels = image;

  // Blur first: blurring after sharpening would undo the sharpening.
  if (filters.blur > 0) current = blur(current, filters.blur);
  if (needsColorPass(filters)) current = applyColorFilters(current, filters);
  if (filters.sharpen > 0) current = sharpenPixels(current, filters.sharpen / 100);

  return current;
}

export interface ApplyOpsOptions {
  /**
   * True when the target format cannot store alpha. Forces a flatten even if
   * the user never picked a background, so transparency does not become black.
   */
  targetSupportsAlpha: boolean;
}

export async function applyOps(
  input: ImageData,
  ops: ImageOps,
  { targetSupportsAlpha }: ApplyOpsOptions,
): Promise<ImageData> {
  let current: Pixels = input;

  const crop = normalizeCrop(current.width, current.height, ops.crop);
  if (crop) current = cropPixels(current, crop);

  if (ops.rotate !== 0 || ops.flipH || ops.flipV) {
    current = orient(current, ops.rotate, ops.flipH, ops.flipV);
  }

  const plan = planResize(current.width, current.height, ops.resize);
  if (plan.sourceCrop) current = cropPixels(current, plan.sourceCrop);
  if (plan.width !== current.width || plan.height !== current.height) {
    current = await resizeImage(toImageData(current), {
      width: plan.width,
      height: plan.height,
      method: "lanczos3",
      fitMethod: "stretch",
      premultiply: true,
      linearRGB: true,
    });
  }

  // A format without alpha needs a background even if the user did not choose
  // one; white is the safe default. Skipped entirely for opaque sources.
  if ((!targetSupportsAlpha || ops.background) && !isOpaque(current)) {
    current = flattenOnto(current, parseHexColor(ops.background ?? "#ffffff"));
  }

  if (!filtersAreNeutral(ops.filters)) {
    current = await applyFilters(current, ops.filters!);
  }

  if (ops.watermark && ops.watermark.text.trim() !== "") {
    current = drawWatermark(current, ops.watermark);
  }

  return toImageData(current);
}
