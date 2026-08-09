import { describe, expect, it } from "vitest";
import { encodeBmp, encodeIco } from "./containers";
import { sniff } from "../../sniff";
import type { Pixels } from "./pixels";

function image(width: number, height: number, pixels: number[][]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach((pixel, i) => data.set(pixel, i * 4));
  return { data, width, height };
}

describe("encodeBmp", () => {
  const red = image(1, 1, [[255, 0, 0, 255]]);

  it("produces bytes our own sniffer identifies as BMP", () => {
    // Round-tripping through the sniffer catches a wrong magic number, which a
    // byte-level assertion alone would not.
    expect(sniff(encodeBmp(red))?.format).toBe("bmp");
  });

  it("writes a file size field matching the actual byte length", () => {
    const buffer = encodeBmp(image(4, 3, []));
    const view = new DataView(buffer);
    expect(view.getUint32(2, true)).toBe(buffer.byteLength);
  });

  it("sizes the file as header plus 4 bytes per pixel", () => {
    const buffer = encodeBmp(image(4, 3, []));
    expect(buffer.byteLength).toBe(14 + 108 + 4 * 3 * 4);
  });

  it("points the pixel offset just past both headers", () => {
    const view = new DataView(encodeBmp(red));
    expect(view.getUint32(10, true)).toBe(14 + 108);
  });

  it("declares a V4 header with 32 bits per pixel and bitfield masks", () => {
    const view = new DataView(encodeBmp(red));
    expect(view.getUint32(14, true)).toBe(108); // BITMAPV4HEADER
    expect(view.getUint16(14 + 14, true)).toBe(32); // bpp
    expect(view.getUint32(14 + 16, true)).toBe(3); // BI_BITFIELDS
    expect(view.getUint32(14 + 52, true)).toBe(0xff000000); // alpha mask
  });

  it("writes pixels as BGRA", () => {
    const bytes = new Uint8Array(encodeBmp(image(1, 1, [[10, 20, 30, 40]])));
    const pixel = bytes.slice(14 + 108);
    expect(Array.from(pixel)).toEqual([30, 20, 10, 40]);
  });

  it("writes rows bottom-up", () => {
    // Two rows: top is red, bottom is blue. BMP stores the bottom row first.
    const twoRows = image(1, 2, [
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ]);
    const bytes = new Uint8Array(encodeBmp(twoRows));
    const data = bytes.slice(14 + 108);
    expect(Array.from(data.slice(0, 4))).toEqual([255, 0, 0, 255]); // blue, BGRA
    expect(Array.from(data.slice(4, 8))).toEqual([0, 0, 255, 255]); // red, BGRA
  });

  it("preserves transparency instead of dropping it", () => {
    const bytes = new Uint8Array(encodeBmp(image(1, 1, [[1, 2, 3, 0]])));
    expect(bytes[14 + 108 + 3]).toBe(0);
  });
});

describe("encodeIco", () => {
  const fakePng = (size: number): ArrayBuffer => new Uint8Array(size).fill(0xab).buffer;

  it("rejects an empty icon set", () => {
    expect(() => encodeIco([])).toThrow(/at least one/i);
  });

  it("produces bytes our own sniffer identifies as ICO", () => {
    const ico = encodeIco([{ png: fakePng(20), width: 16, height: 16 }]);
    expect(sniff(ico)?.format).toBe("ico");
  });

  it("writes the ICONDIR header", () => {
    const view = new DataView(encodeIco([{ png: fakePng(20), width: 16, height: 16 }]));
    expect(view.getUint16(0, true)).toBe(0); // reserved
    expect(view.getUint16(2, true)).toBe(1); // type: icon
    expect(view.getUint16(4, true)).toBe(1); // count
  });

  it("sizes the file as directory plus every payload", () => {
    const ico = encodeIco([
      { png: fakePng(20), width: 16, height: 16 },
      { png: fakePng(50), width: 32, height: 32 },
    ]);
    expect(ico.byteLength).toBe(6 + 2 * 16 + 20 + 50);
  });

  it("gives each entry an offset and length that locate its payload exactly", () => {
    const first = new Uint8Array(11).fill(1).buffer;
    const second = new Uint8Array(23).fill(2).buffer;
    const ico = encodeIco([
      { png: first, width: 16, height: 16 },
      { png: second, width: 32, height: 32 },
    ]);

    const view = new DataView(ico);
    const bytes = new Uint8Array(ico);

    for (const [index, expected] of [
      [0, 1],
      [1, 2],
    ] as const) {
      const at = 6 + index * 16;
      const length = view.getUint32(at + 8, true);
      const offset = view.getUint32(at + 12, true);
      const payload = bytes.slice(offset, offset + length);
      expect(payload.every((byte) => byte === expected)).toBe(true);
    }
  });

  it("encodes 256 as the byte 0, which is how ICO spells it", () => {
    const bytes = new Uint8Array(encodeIco([{ png: fakePng(10), width: 256, height: 256 }]));
    expect(bytes[6]).toBe(0);
    expect(bytes[7]).toBe(0);
  });

  it("writes ordinary sizes literally", () => {
    const bytes = new Uint8Array(encodeIco([{ png: fakePng(10), width: 48, height: 48 }]));
    expect(bytes[6]).toBe(48);
    expect(bytes[7]).toBe(48);
  });
});
