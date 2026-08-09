/**
 * The vocabulary shared by the UI, the worker, and the server route.
 *
 * Everything crossing a thread or network boundary is structured-clone-safe:
 * plain objects, ArrayBuffers, no class instances and no functions.
 */

import type { FormatId } from "../formats";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeFit = "contain" | "cover" | "fill";

export type ResizeSpec =
  | { mode: "percent"; percent: number; noEnlarge: boolean }
  | {
      mode: "dimensions";
      /** `null` on an axis means "derive it from the other one". */
      width: number | null;
      height: number | null;
      fit: ResizeFit;
      noEnlarge: boolean;
    };

export interface FilterSpec {
  /** 0–200, where 100 is unchanged. */
  brightness: number;
  contrast: number;
  saturation: number;
  /** 0–100. */
  grayscale: number;
  sepia: number;
  /** Gaussian radius in pixels; 0 is off. */
  blur: number;
  /** 0–100 unsharp-mask strength. */
  sharpen: number;
}

export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface WatermarkSpec {
  text: string;
  /** Fraction of the image's smaller side, so it scales with the output. */
  sizeRatio: number;
  color: string;
  opacity: number;
  position: WatermarkPosition;
  /** Fraction of the smaller side. */
  marginRatio: number;
}

/**
 * The transform stage, applied in exactly this order:
 * crop → rotate → flip → resize → flatten → filters → watermark.
 *
 * The order matters and is fixed: cropping before resizing means crop
 * coordinates are always in source pixels, and watermarking last means the mark
 * is never blurred or resampled.
 */
export interface ImageOps {
  crop: CropRect | null;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  resize: ResizeSpec | null;
  /**
   * Hex colour composited under the image. Required when the target format has
   * no alpha channel, otherwise transparent pixels come out black.
   */
  background: string | null;
  filters: FilterSpec | null;
  watermark: WatermarkSpec | null;
}

export interface EncodeOptions {
  /** Ignored by formats whose `quality` spec is null. */
  quality: number;
  lossless: boolean;
  /** Run oxipng over PNG output. Slower, typically 10–20% smaller. */
  optimize: boolean;
  /**
   * When set, quality is searched rather than used directly, until the encoded
   * result fits under this many bytes.
   */
  targetBytes: number | null;
}

export const DEFAULT_OPS: ImageOps = {
  crop: null,
  rotate: 0,
  flipH: false,
  flipV: false,
  resize: null,
  background: null,
  filters: null,
  watermark: null,
};

export const NEUTRAL_FILTERS: FilterSpec = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  sharpen: 0,
};

/** True when applying these filters would be a no-op, so we can skip the pass. */
export function filtersAreNeutral(f: FilterSpec | null): boolean {
  if (!f) return true;
  return (
    f.brightness === 100 &&
    f.contrast === 100 &&
    f.saturation === 100 &&
    f.grayscale === 0 &&
    f.sepia === 0 &&
    f.blur === 0 &&
    f.sharpen === 0
  );
}

/** Raw pixels in a form that survives `postMessage`. */
export interface RawPixels {
  data: ArrayBuffer;
  width: number;
  height: number;
}

/**
 * What the worker is asked to do.
 *
 * `source` is either encoded bytes the worker decodes itself, or pixels the
 * main thread already decoded — the latter for formats only the browser can
 * read (SVG, ICO, BMP, GIF). See `decodesOnMainThread` in formats.ts.
 */
export type JobSource =
  | { kind: "bytes"; bytes: ArrayBuffer; format: FormatId }
  | { kind: "pixels"; pixels: RawPixels };

export interface WorkerJob {
  source: JobSource;
  target: FormatId;
  ops: ImageOps;
  encode: EncodeOptions;
}

export interface WorkerResult {
  bytes: ArrayBuffer;
  mime: string;
  width: number;
  height: number;
  /** The quality actually used — differs from the request under a size target. */
  qualityUsed: number | null;
  /**
   * True when a `targetBytes` budget could not be met even at minimum quality.
   * The result is still the smallest we managed, so the UI warns rather than
   * failing the file.
   */
  targetMissed: boolean;
}
