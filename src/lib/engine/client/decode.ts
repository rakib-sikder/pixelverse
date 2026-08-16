/**
 * Turning encoded bytes into pixels, inside the worker.
 *
 * Every codec is behind a dynamic `import()`. That is the whole reason this app
 * loads fast: converting a JPEG to WebP downloads the JPEG and WebP wasm and
 * nothing else — the AVIF, JXL, HEIC and TIFF codecs stay on the server until
 * someone actually opens one of those files.
 *
 * Formats the browser can read natively (BMP, GIF, ICO, SVG) never reach this
 * file; the main thread decodes those and sends pixels instead. See
 * `decodesOnMainThread` in formats.ts.
 */

import { FORMATS, type FormatId } from "../../formats";

/**
 * Served as a static asset by `scripts/copy-codecs.mjs`, not bundled.
 * Held in a variable so TypeScript resolves the *types* from node_modules while
 * the runtime import resolves against the site's origin.
 */
const HEIC_CODEC_URL = "/codecs/libheif-bundle.mjs";

function orThrow(image: ImageData | null, format: FormatId): ImageData {
  if (!image) throw new Error(`This ${FORMATS[format].label} file could not be decoded.`);
  return image;
}

export async function decodeToImageData(bytes: ArrayBuffer, format: FormatId): Promise<ImageData> {
  switch (format) {
    case "jpeg": {
      const { default: decode } = await import("@jsquash/jpeg/decode");
      return decode(bytes);
    }
    case "png": {
      const { default: decode } = await import("@jsquash/png/decode");
      return decode(bytes);
    }
    case "webp": {
      const { default: decode } = await import("@jsquash/webp/decode");
      return decode(bytes);
    }
    case "avif": {
      const { default: decode } = await import("@jsquash/avif/decode");
      // Alone among the jSquash decoders, this one resolves null on a file it
      // cannot parse instead of rejecting.
      return orThrow(await decode(bytes), "avif");
    }
    case "jxl": {
      const { default: decode } = await import("@jsquash/jxl/decode");
      return decode(bytes);
    }
    case "heic":
      return decodeHeic(bytes);
    case "tiff":
      return decodeTiff(bytes);
    default:
      throw new Error(`${format.toUpperCase()} cannot be decoded in the worker.`);
  }
}

/**
 * HEIC via libheif.
 *
 * Loaded from `/codecs/` at runtime rather than imported, deliberately. The
 * libheif bundle is 1.4 MB of minified emscripten with its wasm inlined as
 * base64; putting it through the bundler stalls the build for minutes and
 * produces nothing better. The ignore comments tell webpack and Turbopack to
 * leave this import alone so it resolves in the browser instead.
 */
async function decodeHeic(bytes: ArrayBuffer): Promise<ImageData> {
  const { default: libheifFactory } = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ HEIC_CODEC_URL
  )) as typeof import("libheif-js/libheif-wasm/libheif-bundle.mjs");
  const libheif = await libheifFactory();

  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(bytes));
  if (!images || images.length === 0) {
    throw new Error("No image found inside this HEIC file.");
  }

  // A HEIC can hold a burst or a Live Photo; the first image is the still.
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  const target = new ImageData(width, height);

  await new Promise<void>((resolve, reject) => {
    image.display(target, (result: unknown) => {
      if (!result) reject(new Error("HEIC decoding failed."));
      else resolve();
    });
  });

  return target;
}

/**
 * TIFF via UTIF. Deflate-compressed TIFFs need pako, which UTIF looks up as a
 * bare `require`/global — the worker entry installs it on `self` before this
 * module is ever imported.
 */
async function decodeTiff(bytes: ArrayBuffer): Promise<ImageData> {
  const UTIF = (await import("utif2")).default;

  const pages = UTIF.decode(bytes);
  if (pages.length === 0) throw new Error("No image found inside this TIFF file.");

  const page = pages[0];
  UTIF.decodeImage(bytes, page);
  const rgba = UTIF.toRGBA8(page);

  if (!page.width || !page.height) {
    throw new Error("This TIFF has no readable image dimensions.");
  }

  // UTIF hands back a Uint8Array view; reinterpreting the same bytes as clamped
  // avoids copying what can be hundreds of megabytes for a large scan.
  const clamped = new Uint8ClampedArray(
    rgba.buffer as ArrayBuffer,
    rgba.byteOffset,
    rgba.byteLength,
  );
  return new ImageData(clamped, page.width, page.height);
}
