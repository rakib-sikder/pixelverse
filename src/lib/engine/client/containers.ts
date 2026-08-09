/**
 * Hand-written binary writers for the two container formats no codec covers.
 *
 * Both are simple enough that pulling in a dependency would cost more than it
 * saves, and both are pure byte arithmetic — so they are tested directly rather
 * than through a browser.
 */

import type { Pixels } from "./pixels";

/** BITMAPV4HEADER — the smallest BMP header that can describe an alpha channel. */
const BMP_HEADER_SIZE = 108;
const BMP_FILE_HEADER_SIZE = 14;
const BI_BITFIELDS = 3;
/** 'sRGB' as a big-endian FourCC, the value LCS_sRGB is defined as. */
const LCS_sRGB = 0x73524742;

/**
 * Writes a 32-bit BMP with a real alpha channel.
 *
 * 24-bit BI_RGB would be half the size but silently drops transparency, which
 * would make BMP the one output format that quietly loses data.
 */
export function encodeBmp(image: Pixels): ArrayBuffer {
  const { width, height, data } = image;
  // 32bpp rows are inherently 4-byte aligned, so no row padding is needed.
  const pixelBytes = width * height * 4;
  const fileSize = BMP_FILE_HEADER_SIZE + BMP_HEADER_SIZE + pixelBytes;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x42; // 'B'
  bytes[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true); // reserved
  view.setUint32(10, BMP_FILE_HEADER_SIZE + BMP_HEADER_SIZE, true); // pixel data offset

  let at = BMP_FILE_HEADER_SIZE;
  view.setUint32(at, BMP_HEADER_SIZE, true);
  view.setInt32(at + 4, width, true);
  // A positive height means bottom-up row order, which is the BMP default and
  // the one every decoder handles.
  view.setInt32(at + 8, height, true);
  view.setUint16(at + 12, 1, true); // planes
  view.setUint16(at + 14, 32, true); // bits per pixel
  view.setUint32(at + 16, BI_BITFIELDS, true);
  view.setUint32(at + 20, pixelBytes, true);
  view.setInt32(at + 24, 2835, true); // ~72 DPI horizontal
  view.setInt32(at + 28, 2835, true); // ~72 DPI vertical
  view.setUint32(at + 32, 0, true); // colours used
  view.setUint32(at + 36, 0, true); // important colours
  view.setUint32(at + 40, 0x00ff0000, true); // red mask
  view.setUint32(at + 44, 0x0000ff00, true); // green mask
  view.setUint32(at + 48, 0x000000ff, true); // blue mask
  view.setUint32(at + 52, 0xff000000, true); // alpha mask
  view.setUint32(at + 56, LCS_sRGB, true);
  // Bytes 60..95 are CIE endpoints and 96..107 are gamma — all zero under sRGB.

  at = BMP_FILE_HEADER_SIZE + BMP_HEADER_SIZE;
  for (let y = height - 1; y >= 0; y--) {
    let from = y * width * 4;
    for (let x = 0; x < width; x++) {
      bytes[at++] = data[from + 2]; // B
      bytes[at++] = data[from + 1]; // G
      bytes[at++] = data[from]; // R
      bytes[at++] = data[from + 3]; // A
      from += 4;
    }
  }

  return buffer;
}

const ICONDIR_SIZE = 6;
const ICONDIRENTRY_SIZE = 16;

export interface IcoEntry {
  /** PNG bytes for this size. */
  png: ArrayBuffer;
  width: number;
  height: number;
}

/**
 * Packs PNGs into an ICO container.
 *
 * PNG-inside-ICO is the modern encoding: Windows has accepted it since Vista
 * and every browser reads it, and it avoids the AND-mask and bottom-up BMP
 * rows the original format required.
 */
export function encodeIco(entries: IcoEntry[]): ArrayBuffer {
  if (entries.length === 0) throw new Error("An ICO needs at least one image.");
  if (entries.length > 255) throw new Error("An ICO can hold at most 255 images.");

  const directorySize = ICONDIR_SIZE + entries.length * ICONDIRENTRY_SIZE;
  const totalSize = entries.reduce((sum, entry) => sum + entry.png.byteLength, directorySize);

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type 1 = icon
  view.setUint16(4, entries.length, true);

  let dataOffset = directorySize;
  entries.forEach((entry, index) => {
    const at = ICONDIR_SIZE + index * ICONDIRENTRY_SIZE;
    // The dimension fields are a single byte each, where 0 means 256 — so 256
    // is the largest size an ICO can describe at all.
    bytes[at] = entry.width >= 256 ? 0 : entry.width;
    bytes[at + 1] = entry.height >= 256 ? 0 : entry.height;
    bytes[at + 2] = 0; // palette size, 0 for truecolour
    bytes[at + 3] = 0; // reserved
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, entry.png.byteLength, true);
    view.setUint32(at + 12, dataOffset, true);

    bytes.set(new Uint8Array(entry.png), dataOffset);
    dataOffset += entry.png.byteLength;
  });

  return buffer;
}

/** The sizes a favicon pack ships, largest first. */
export const FAVICON_SIZES = [256, 128, 64, 48, 32, 16] as const;
