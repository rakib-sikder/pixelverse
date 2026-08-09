/**
 * Hand-written declarations for the two dependencies that ship no types.
 * Kept deliberately narrow — only the surface PixelVerse actually calls.
 */

declare module "gifenc" {
  export type QuantizeFormat = "rgb565" | "rgb444" | "rgba4444";

  export interface QuantizeOptions {
    format?: QuantizeFormat;
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  }

  export interface WriteFrameOptions {
    palette?: number[][];
    first?: boolean;
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    repeat?: number;
    dispose?: number;
  }

  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoderInstance;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions,
  ): number[][];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: QuantizeFormat,
  ): Uint8Array;
}

declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    /** Fills `target.data` in place, then calls back with it (or null on failure). */
    display(target: ImageData, callback: (result: ImageData | null) => void): void;
  }

  export interface HeifDecoderInstance {
    decode(buffer: Uint8Array): HeifImage[];
  }

  export interface LibHeif {
    HeifDecoder: new () => HeifDecoderInstance;
  }

  /** The bundle's default export is a factory that resolves once wasm is ready. */
  const factory: () => Promise<LibHeif>;
  export default factory;
}
