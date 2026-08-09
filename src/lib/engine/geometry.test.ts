import { describe, expect, it } from "vitest";
import { centeredCrop, normalizeCrop, planResize, rotatedSize } from "./geometry";
import type { ResizeSpec } from "./types";

const dims = (
  width: number | null,
  height: number | null,
  fit: "contain" | "cover" | "fill" = "contain",
  noEnlarge = false,
): ResizeSpec => ({ mode: "dimensions", width, height, fit, noEnlarge });

describe("rotatedSize", () => {
  it("leaves 0 and 180 alone", () => {
    expect(rotatedSize(800, 600, 0)).toEqual({ width: 800, height: 600 });
    expect(rotatedSize(800, 600, 180)).toEqual({ width: 800, height: 600 });
  });

  it("swaps axes for quarter turns", () => {
    expect(rotatedSize(800, 600, 90)).toEqual({ width: 600, height: 800 });
    expect(rotatedSize(800, 600, 270)).toEqual({ width: 600, height: 800 });
  });
});

describe("planResize", () => {
  it("passes through a null spec", () => {
    expect(planResize(800, 600, null)).toEqual({ width: 800, height: 600, sourceCrop: null });
  });

  describe("percent", () => {
    it("scales both axes", () => {
      expect(planResize(800, 600, { mode: "percent", percent: 50, noEnlarge: false })).toEqual({
        width: 400,
        height: 300,
        sourceCrop: null,
      });
    });

    it("enlarges when allowed", () => {
      expect(planResize(800, 600, { mode: "percent", percent: 200, noEnlarge: false })).toEqual({
        width: 1600,
        height: 1200,
        sourceCrop: null,
      });
    });

    it("caps at 100% when noEnlarge is set", () => {
      expect(planResize(800, 600, { mode: "percent", percent: 200, noEnlarge: true })).toEqual({
        width: 800,
        height: 600,
        sourceCrop: null,
      });
    });

    it("never rounds an axis down to zero", () => {
      const plan = planResize(10, 10, { mode: "percent", percent: 1, noEnlarge: false });
      expect(plan.width).toBe(1);
      expect(plan.height).toBe(1);
    });
  });

  describe("single axis", () => {
    it("derives height from width", () => {
      expect(planResize(800, 600, dims(400, null))).toEqual({
        width: 400,
        height: 300,
        sourceCrop: null,
      });
    });

    it("derives width from height", () => {
      expect(planResize(800, 600, dims(null, 300))).toEqual({
        width: 400,
        height: 300,
        sourceCrop: null,
      });
    });

    it("respects noEnlarge on a single axis", () => {
      expect(planResize(800, 600, dims(1600, null, "contain", true))).toEqual({
        width: 800,
        height: 600,
        sourceCrop: null,
      });
    });

    it("treats zero and negative dimensions as unset", () => {
      expect(planResize(800, 600, dims(0, 0))).toEqual({
        width: 800,
        height: 600,
        sourceCrop: null,
      });
    });
  });

  describe("fit: contain", () => {
    it("fits inside the box without overflowing either axis", () => {
      // 800x600 into a 400x400 box is limited by width.
      expect(planResize(800, 600, dims(400, 400, "contain"))).toEqual({
        width: 400,
        height: 300,
        sourceCrop: null,
      });
    });

    it("is limited by height for a tall source", () => {
      expect(planResize(600, 800, dims(400, 400, "contain"))).toEqual({
        width: 300,
        height: 400,
        sourceCrop: null,
      });
    });
  });

  describe("fit: fill", () => {
    it("takes the box exactly, distorting the image", () => {
      expect(planResize(800, 600, dims(400, 400, "fill"))).toEqual({
        width: 400,
        height: 400,
        sourceCrop: null,
      });
    });
  });

  describe("fit: cover", () => {
    it("fills the box exactly and trims the overhang from the source", () => {
      // A 4:3 source into a square box loses the left and right edges.
      const plan = planResize(800, 600, dims(400, 400, "cover"));
      expect(plan.width).toBe(400);
      expect(plan.height).toBe(400);
      expect(plan.sourceCrop).toEqual({ x: 100, y: 0, width: 600, height: 600 });
    });

    it("trims top and bottom for a tall source", () => {
      const plan = planResize(600, 800, dims(400, 400, "cover"));
      expect(plan.sourceCrop).toEqual({ x: 0, y: 100, width: 600, height: 600 });
    });

    it("needs no crop when the aspect ratios already agree", () => {
      const plan = planResize(800, 600, dims(400, 300, "cover"));
      expect(plan.sourceCrop).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    });

    it("shrinks the box rather than enlarging when noEnlarge is set", () => {
      const plan = planResize(200, 200, dims(400, 400, "cover", true));
      expect(plan.width).toBe(200);
      expect(plan.height).toBe(200);
    });
  });
});

describe("centeredCrop", () => {
  it("returns the whole image when the aspect already matches", () => {
    expect(centeredCrop(800, 600, 800 / 600)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it("centres horizontally when trimming width", () => {
    const crop = centeredCrop(800, 600, 1);
    expect(crop).toEqual({ x: 100, y: 0, width: 600, height: 600 });
    // Equal margins on both sides.
    expect(crop.x).toBe(800 - crop.x - crop.width);
  });
});

describe("normalizeCrop", () => {
  it("returns null for a null crop", () => {
    expect(normalizeCrop(800, 600, null)).toBeNull();
  });

  it("returns null when the crop covers everything, so the pass can be skipped", () => {
    expect(normalizeCrop(800, 600, { x: 0, y: 0, width: 800, height: 600 })).toBeNull();
  });

  it("keeps a genuine crop", () => {
    expect(normalizeCrop(800, 600, { x: 10, y: 20, width: 100, height: 200 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    });
  });

  it("clamps a crop that runs off the right edge", () => {
    expect(normalizeCrop(800, 600, { x: 700, y: 0, width: 400, height: 600 })).toEqual({
      x: 700,
      y: 0,
      width: 100,
      height: 600,
    });
  });

  it("clamps negative origins back inside the image", () => {
    expect(normalizeCrop(800, 600, { x: -50, y: -50, width: 100, height: 100 })).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  it("never produces a zero-sized crop", () => {
    const crop = normalizeCrop(800, 600, { x: 799, y: 599, width: 0, height: 0 });
    expect(crop?.width).toBe(1);
    expect(crop?.height).toBe(1);
  });
});
