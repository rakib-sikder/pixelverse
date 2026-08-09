/**
 * Format detection from file content.
 *
 * We never trust the file extension or the browser-reported MIME type. Windows
 * hands us an empty `type` for half the formats we support, and a `.jpg` that
 * is really a PNG is common enough that guessing from the name produces
 * confusing "decoding error" failures deep inside a codec.
 *
 * Only the first few hundred bytes are needed, so callers should slice rather
 * than read whole files into memory.
 */

import type { FormatId } from "./formats";

export interface SniffResult {
  format: FormatId;
  /** True only when we positively confirmed more than one frame. */
  animated: boolean;
}

/** Enough bytes for every signature below, plus room for the GIF block walk. */
export const SNIFF_BYTES = 4096;

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const b = bytes[offset + i];
    if (b === undefined) return out;
    out += String.fromCharCode(b);
  }
  return out;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}

/**
 * Walks a GIF's block structure looking for a second image descriptor.
 *
 * A plain scan for the 0x2C descriptor marker gives false positives, because
 * 0x2C occurs constantly inside colour tables and LZW data. Walking the blocks
 * properly is the only reliable way, and it is cheap because we stop at the
 * second frame.
 */
function isAnimatedGif(bytes: Uint8Array): boolean {
  let pos = 6; // past "GIF89a"
  if (bytes.length < pos + 7) return false;

  const packed = bytes[pos + 4];
  pos += 7; // logical screen descriptor

  if (packed & 0x80) {
    pos += 3 * (1 << ((packed & 0x07) + 1)); // global colour table
  }

  let frames = 0;
  while (pos < bytes.length) {
    const marker = bytes[pos];

    if (marker === 0x3b) return false; // trailer

    if (marker === 0x21) {
      // Extension block: label, then length-prefixed sub-blocks.
      pos += 2;
      pos = skipSubBlocks(bytes, pos);
      continue;
    }

    if (marker === 0x2c) {
      frames++;
      if (frames > 1) return true;
      const imagePacked = bytes[pos + 9];
      if (imagePacked === undefined) return false;
      pos += 10; // image descriptor
      if (imagePacked & 0x80) {
        pos += 3 * (1 << ((imagePacked & 0x07) + 1)); // local colour table
      }
      pos += 1; // LZW minimum code size
      pos = skipSubBlocks(bytes, pos);
      continue;
    }

    return false; // unknown marker — malformed, stop guessing
  }

  // Ran out of the sniff window mid-file. One frame seen, rest unknown.
  return false;
}

/** Advances past a chain of length-prefixed sub-blocks ending in a zero byte. */
function skipSubBlocks(bytes: Uint8Array, start: number): number {
  let pos = start;
  while (pos < bytes.length) {
    const size = bytes[pos];
    if (size === undefined) return bytes.length;
    if (size === 0) return pos + 1;
    pos += size + 1;
  }
  return bytes.length;
}

/** WebP marks animation with a flag bit in its optional VP8X header chunk. */
function isAnimatedWebp(bytes: Uint8Array): boolean {
  // "RIFF" size4 "WEBP" then chunks. VP8X, if present, is always first.
  if (ascii(bytes, 12, 4) !== "VP8X") return false;
  const flags = bytes[20];
  return flags !== undefined && (flags & 0x02) !== 0;
}

/** Reads the brand list out of an ISO base-media file (`ftyp` box). */
function isoBrands(bytes: Uint8Array): string[] {
  const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  const brands = [ascii(bytes, 8, 4)];
  // Compatible brands run from byte 16 to the end of the ftyp box.
  const end = Math.min(boxSize, bytes.length);
  for (let pos = 16; pos + 4 <= end; pos += 4) {
    brands.push(ascii(bytes, pos, 4));
  }
  return brands;
}

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

/**
 * Identifies an image from its leading bytes, or returns `null` if nothing
 * matches — which the caller should surface as "unsupported file", not as a
 * decode failure.
 */
export function sniff(input: ArrayBuffer | Uint8Array): SniffResult | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 4) return null;

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { format: "jpeg", animated: false };
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { format: "png", animated: false };
  }

  const gifHeader = ascii(bytes, 0, 6);
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return { format: "gif", animated: isAnimatedGif(bytes) };
  }

  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { format: "webp", animated: isAnimatedWebp(bytes) };
  }

  if (ascii(bytes, 4, 4) === "ftyp") {
    const brands = isoBrands(bytes);
    if (brands.some((b) => AVIF_BRANDS.has(b))) {
      // `avis` is the image-sequence brand — the animated one.
      return { format: "avif", animated: brands.includes("avis") };
    }
    if (brands.some((b) => HEIC_BRANDS.has(b))) {
      return { format: "heic", animated: false };
    }
    // `mif1` alone is ambiguous; HEIC is by far the likelier producer.
    if (brands.includes("mif1") || brands.includes("msf1")) {
      return { format: "heic", animated: false };
    }
  }

  // JXL ships as either a naked codestream or an ISO-BMFF container.
  if (startsWith(bytes, [0xff, 0x0a])) {
    return { format: "jxl", animated: false };
  }
  if (startsWith(bytes, [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a])) {
    return { format: "jxl", animated: false };
  }

  if (startsWith(bytes, [0x42, 0x4d])) {
    return { format: "bmp", animated: false };
  }

  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) {
    return { format: "tiff", animated: false };
  }

  // ICO: reserved 0x0000, type 0x0001, then a non-zero image count.
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00]) && (bytes[4] | bytes[5]) !== 0) {
    return { format: "ico", animated: false };
  }

  if (ascii(bytes, 0, 5) === "%PDF-") {
    return { format: "pdf", animated: false };
  }

  if (looksLikeSvg(bytes)) {
    return { format: "svg", animated: false };
  }

  return null;
}

/**
 * SVG has no magic number, so we decode the head as text and look for the root
 * element. XML declarations, comments, and doctypes may all precede it.
 */
function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .replace(/^﻿/, "")
    .trimStart();

  if (!head.startsWith("<")) return false;
  return /<svg[\s>]/i.test(head);
}

/**
 * Reads just the leading bytes of a File and identifies it.
 * Returns `null` for anything we cannot read.
 */
export async function sniffFile(file: File | Blob): Promise<SniffResult | null> {
  const head = await file.slice(0, SNIFF_BYTES).arrayBuffer();
  return sniff(head);
}
