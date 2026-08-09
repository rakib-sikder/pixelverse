import { describe, expect, it } from "vitest";
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
import { NEUTRAL_FILTERS } from "../types";

/** Builds an image from an array of [r,g,b,a] tuples laid out row-major. */
function image(width: number, height: number, pixels: number[][]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach((pixel, i) => data.set(pixel, i * 4));
  return { data, width, height };
}

function pixelAt(img: Pixels, x: number, y: number): number[] {
  const i = (y * img.width + x) * 4;
  return Array.from(img.data.slice(i, i + 4));
}

describe("parseHexColor", () => {
  it("parses six-digit hex with and without the hash", () => {
    expect(parseHexColor("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
    expect(parseHexColor("ff8800")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("expands three-digit shorthand", () => {
    expect(parseHexColor("#f80")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("is case-insensitive and tolerates whitespace", () => {
    expect(parseHexColor("  #FF8800 ")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("falls back to white for junk rather than throwing", () => {
    // White is the least destructive background for a flattened logo.
    expect(parseHexColor("not a colour")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor("")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor("#ff88")).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe("cropPixels", () => {
  it("extracts the requested rectangle", () => {
    // 3x2 image, each pixel tagged with a unique red value.
    const source = image(3, 2, [
      [10, 0, 0, 255],
      [20, 0, 0, 255],
      [30, 0, 0, 255],
      [40, 0, 0, 255],
      [50, 0, 0, 255],
      [60, 0, 0, 255],
    ]);

    const cropped = cropPixels(source, { x: 1, y: 0, width: 2, height: 2 });

    expect(cropped.width).toBe(2);
    expect(cropped.height).toBe(2);
    expect(pixelAt(cropped, 0, 0)[0]).toBe(20);
    expect(pixelAt(cropped, 1, 0)[0]).toBe(30);
    expect(pixelAt(cropped, 0, 1)[0]).toBe(50);
    expect(pixelAt(cropped, 1, 1)[0]).toBe(60);
  });

  it("does not alias the source buffer", () => {
    const source = image(2, 1, [
      [10, 0, 0, 255],
      [20, 0, 0, 255],
    ]);
    const cropped = cropPixels(source, { x: 0, y: 0, width: 1, height: 1 });
    cropped.data[0] = 99;
    expect(source.data[0]).toBe(10);
  });
});

describe("flattenOnto", () => {
  it("leaves opaque pixels untouched", () => {
    const source = image(1, 1, [[10, 20, 30, 255]]);
    const flat = flattenOnto(source, { r: 255, g: 255, b: 255 });
    expect(pixelAt(flat, 0, 0)).toEqual([10, 20, 30, 255]);
  });

  it("turns a fully transparent pixel into the background colour", () => {
    // This is the JPEG-goes-black case: without flattening these become 0,0,0.
    const source = image(1, 1, [[0, 0, 0, 0]]);
    const flat = flattenOnto(source, { r: 255, g: 255, b: 255 });
    expect(pixelAt(flat, 0, 0)).toEqual([255, 255, 255, 255]);
  });

  it("blends a half-transparent pixel toward the background", () => {
    const source = image(1, 1, [[0, 0, 0, 128]]);
    const flat = flattenOnto(source, { r: 255, g: 255, b: 255 });
    const [r, , , a] = pixelAt(flat, 0, 0);
    expect(r).toBeGreaterThan(120);
    expect(r).toBeLessThan(135);
    expect(a).toBe(255);
  });

  it("always produces a fully opaque result", () => {
    const source = image(2, 1, [
      [0, 0, 0, 0],
      [10, 10, 10, 90],
    ]);
    expect(isOpaque(flattenOnto(source, { r: 0, g: 0, b: 0 }))).toBe(true);
  });

  it("does not mutate the source", () => {
    const source = image(1, 1, [[0, 0, 0, 0]]);
    flattenOnto(source, { r: 255, g: 255, b: 255 });
    expect(pixelAt(source, 0, 0)).toEqual([0, 0, 0, 0]);
  });
});

describe("needsColorPass", () => {
  it("is false for neutral filters", () => {
    expect(needsColorPass(NEUTRAL_FILTERS)).toBe(false);
  });

  it("ignores blur and sharpen, which are handled separately", () => {
    expect(needsColorPass({ ...NEUTRAL_FILTERS, blur: 5, sharpen: 50 })).toBe(false);
  });

  it("is true when any colour knob moved", () => {
    expect(needsColorPass({ ...NEUTRAL_FILTERS, saturation: 120 })).toBe(true);
    expect(needsColorPass({ ...NEUTRAL_FILTERS, grayscale: 1 })).toBe(true);
  });
});

describe("applyColorFilters", () => {
  const mid = image(1, 1, [[100, 150, 200, 255]]);

  it("is a no-op with neutral settings", () => {
    expect(pixelAt(applyColorFilters(mid, NEUTRAL_FILTERS), 0, 0)).toEqual([100, 150, 200, 255]);
  });

  it("scales channels for brightness", () => {
    const out = applyColorFilters(mid, { ...NEUTRAL_FILTERS, brightness: 50 });
    expect(pixelAt(out, 0, 0).slice(0, 3)).toEqual([50, 75, 100]);
  });

  it("clamps rather than wrapping when brightness overflows", () => {
    // Uint8ClampedArray must saturate at 255; wrapping would invert highlights.
    const out = applyColorFilters(mid, { ...NEUTRAL_FILTERS, brightness: 300 });
    expect(pixelAt(out, 0, 0).slice(0, 3)).toEqual([255, 255, 255]);
  });

  it("pushes everything to mid-grey at zero contrast", () => {
    const out = applyColorFilters(mid, { ...NEUTRAL_FILTERS, contrast: 0 });
    expect(pixelAt(out, 0, 0).slice(0, 3)).toEqual([128, 128, 128]);
  });

  it("makes all channels equal at full grayscale", () => {
    const [r, g, b] = pixelAt(applyColorFilters(mid, { ...NEUTRAL_FILTERS, grayscale: 100 }), 0, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("desaturates to grey at zero saturation", () => {
    const [r, g, b] = pixelAt(applyColorFilters(mid, { ...NEUTRAL_FILTERS, saturation: 0 }), 0, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("warms the image toward red for sepia", () => {
    const grey = image(1, 1, [[128, 128, 128, 255]]);
    const [r, g, b] = pixelAt(applyColorFilters(grey, { ...NEUTRAL_FILTERS, sepia: 100 }), 0, 0);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it("preserves alpha", () => {
    const translucent = image(1, 1, [[100, 150, 200, 77]]);
    const out = applyColorFilters(translucent, { ...NEUTRAL_FILTERS, grayscale: 100 });
    expect(pixelAt(out, 0, 0)[3]).toBe(77);
  });
});

describe("sharpenPixels", () => {
  it("returns the input unchanged at zero amount", () => {
    const flat = image(1, 1, [[100, 100, 100, 255]]);
    expect(sharpenPixels(flat, 0)).toBe(flat);
  });

  it("leaves a uniform image uniform", () => {
    // A constant field has no edges, so sharpening must not shift it.
    const uniform: Pixels = {
      data: new Uint8ClampedArray(3 * 3 * 4).fill(120),
      width: 3,
      height: 3,
    };
    const out = sharpenPixels(uniform, 1);
    expect(pixelAt(out, 1, 1).slice(0, 3)).toEqual([120, 120, 120]);
  });

  it("increases contrast across an edge", () => {
    // Left column dark, right column bright.
    const edge = image(2, 1, [
      [100, 100, 100, 255],
      [150, 150, 150, 255],
    ]);
    const out = sharpenPixels(edge, 1);
    expect(pixelAt(out, 0, 0)[0]).toBeLessThan(100);
    expect(pixelAt(out, 1, 0)[0]).toBeGreaterThan(150);
  });

  it("clamps at the borders instead of wrapping to the far side", () => {
    const edge = image(2, 1, [
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ]);
    const out = sharpenPixels(edge, 1);
    expect(out.data.length).toBe(edge.data.length);
    expect(pixelAt(out, 0, 0)[0]).toBe(0);
  });

  it("preserves alpha", () => {
    const edge = image(2, 1, [
      [100, 100, 100, 40],
      [150, 150, 150, 200],
    ]);
    const out = sharpenPixels(edge, 1);
    expect(pixelAt(out, 0, 0)[3]).toBe(40);
    expect(pixelAt(out, 1, 0)[3]).toBe(200);
  });
});

describe("isOpaque", () => {
  it("detects a fully opaque image", () => {
    expect(isOpaque(image(1, 1, [[0, 0, 0, 255]]))).toBe(true);
  });

  it("detects any transparency", () => {
    expect(
      isOpaque(
        image(2, 1, [
          [0, 0, 0, 255],
          [0, 0, 0, 254],
        ]),
      ),
    ).toBe(false);
  });
});
