/**
 * Turning pixels back into encoded bytes, inside the worker.
 *
 * Same lazy-import discipline as `decode.ts`: no codec is downloaded until
 * something actually targets that format.
 */

import { FORMATS, type FormatId } from "../../formats";
import type { EncodeOptions } from "../types";
import { encodeIco, FAVICON_SIZES, type IcoEntry } from "./containers";
import { encodeBmp } from "./containers";
import { isOpaque, type Pixels } from "./pixels";

export async function encodeImage(
  image: ImageData,
  format: FormatId,
  options: EncodeOptions,
): Promise<ArrayBuffer> {
  switch (format) {
    case "jpeg": {
      const { default: encode } = await import("@jsquash/jpeg/encode");
      return encode(image, { quality: options.quality });
    }

    case "png":
      return encodePng(image, options);

    case "webp": {
      const { default: encode } = await import("@jsquash/webp/encode");
      // libwebp takes lossless as an int flag, not a boolean.
      return encode(image, {
        quality: options.quality,
        lossless: options.lossless ? 1 : 0,
      });
    }

    case "avif": {
      const { default: encode } = await import("@jsquash/avif/encode");
      return encode(image, { quality: options.quality, lossless: options.lossless });
    }

    case "jxl": {
      const { default: encode } = await import("@jsquash/jxl/encode");
      return encode(image, { quality: options.quality, lossless: options.lossless });
    }

    case "bmp":
      return encodeBmp(image);

    case "gif":
      return encodeGif(image);

    case "ico":
      return encodeIcoFrom(image);

    default:
      throw new Error(`${FORMATS[format].label} cannot be encoded in the browser.`);
  }
}

async function encodePng(image: ImageData, options: EncodeOptions): Promise<ArrayBuffer> {
  const { default: encode } = await import("@jsquash/png/encode");
  const png = await encode(image);
  if (!options.optimize) return png;

  // oxipng is a separate wasm module and roughly doubles PNG encode time, so it
  // is only loaded when the user asks for it.
  const { default: optimise } = await import("@jsquash/oxipng/optimise");
  return optimise(png, { level: 3 });
}

/**
 * GIF via gifenc.
 *
 * GIF is limited to a 256-colour palette, so the image is quantized first. The
 * palette format matters: `rgba4444` keeps a transparency index, `rgb565` gives
 * noticeably better colour for images that do not need one.
 */
async function encodeGif(image: ImageData): Promise<ArrayBuffer> {
  const { GIFEncoder, applyPalette, quantize } = await import("gifenc");

  const transparent = !isOpaque(image);
  const format = transparent ? "rgba4444" : "rgb565";

  const palette = quantize(image.data, 256, { format });
  const indexed = applyPalette(image.data, palette, format);

  const encoder = GIFEncoder();
  encoder.writeFrame(indexed, image.width, image.height, {
    palette,
    transparent,
  });
  encoder.finish();

  const bytes = encoder.bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Builds a multi-size ICO.
 *
 * A single-size icon technically works, but Windows and browsers pick the
 * closest available size and scale it — so a one-size icon looks soft at every
 * other size. Emitting the standard ladder up to the source's own resolution is
 * what makes an ICO actually useful.
 */
async function encodeIcoFrom(image: ImageData): Promise<ArrayBuffer> {
  const { default: resizeImage } = await import("@jsquash/resize");
  const { default: encodePngRaw } = await import("@jsquash/png/encode");

  const longest = Math.max(image.width, image.height);
  // Never upscale into the ICO, but always ship at least 16px.
  const sizes = FAVICON_SIZES.filter((size) => size <= longest);
  if (sizes.length === 0) sizes.push(16);

  const entries: IcoEntry[] = [];
  for (const size of sizes) {
    const square =
      image.width === size && image.height === size
        ? image
        : await resizeImage(image, {
            width: size,
            height: size,
            method: "lanczos3",
            fitMethod: "stretch",
            premultiply: true,
            linearRGB: true,
          });
    entries.push({ png: await encodePngRaw(square), width: size, height: size });
  }

  return encodeIco(entries);
}

/** Convenience for the ICO/favicon preset, which needs plain pixels. */
export type { Pixels };
