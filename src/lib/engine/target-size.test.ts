import { describe, expect, it, vi } from "vitest";
import { searchQualityForSize } from "./target-size";

/**
 * A stand-in encoder whose output size grows with quality, which is the
 * property the search relies on.
 */
function linearEncoder(bytesPerQuality = 1000) {
  return vi.fn(async (quality: number) => ({
    result: `q${quality}`,
    bytes: quality * bytesPerQuality,
  }));
}

describe("searchQualityForSize", () => {
  it("finds the highest quality that fits the budget", async () => {
    // 50_000 bytes at 1000 per quality point means quality 50 fits exactly.
    const found = await searchQualityForSize(linearEncoder(), { targetBytes: 50_000 });
    expect(found.quality).toBe(50);
    expect(found.bytes).toBe(50_000);
    expect(found.met).toBe(true);
    expect(found.result).toBe("q50");
  });

  it("never returns a result over the budget when one fits", async () => {
    const found = await searchQualityForSize(linearEncoder(), { targetBytes: 49_999 });
    expect(found.bytes).toBeLessThanOrEqual(49_999);
    expect(found.met).toBe(true);
  });

  it("stays well under the encode budget", async () => {
    const encode = linearEncoder();
    await searchQualityForSize(encode, { targetBytes: 50_000 });
    // A linear walk would be up to 100 encodes; binary search is ~7.
    expect(encode.mock.calls.length).toBeLessThanOrEqual(8);
  });

  it("respects an explicit attempt cap", async () => {
    const encode = linearEncoder();
    await searchQualityForSize(encode, { targetBytes: 50_000, maxAttempts: 3 });
    expect(encode.mock.calls.length).toBe(3);
  });

  it("reports met: false and returns the smallest attempt when nothing fits", async () => {
    // Even quality 1 produces 1000 bytes, over a 500-byte budget.
    const found = await searchQualityForSize(linearEncoder(), { targetBytes: 500 });
    expect(found.met).toBe(false);
    expect(found.quality).toBe(1);
    expect(found.bytes).toBe(1000);
  });

  it("takes the maximum quality when everything fits", async () => {
    const found = await searchQualityForSize(linearEncoder(), { targetBytes: 10_000_000 });
    expect(found.quality).toBe(100);
    expect(found.met).toBe(true);
  });

  it("honours a narrowed quality range", async () => {
    const found = await searchQualityForSize(linearEncoder(), {
      targetBytes: 10_000_000,
      min: 10,
      max: 40,
    });
    expect(found.quality).toBe(40);
  });

  it("only ever queries qualities inside the range", async () => {
    const encode = linearEncoder();
    await searchQualityForSize(encode, { targetBytes: 25_000, min: 10, max: 40 });
    for (const [quality] of encode.mock.calls) {
      expect(quality).toBeGreaterThanOrEqual(10);
      expect(quality).toBeLessThanOrEqual(40);
    }
  });

  it("copes with an encoder whose size is not perfectly monotonic", async () => {
    // Real codecs occasionally produce a slightly larger file at lower quality.
    const encode = vi.fn(async (quality: number) => ({
      result: quality,
      bytes: quality * 1000 + (quality % 7) * 200,
    }));
    const found = await searchQualityForSize(encode, { targetBytes: 50_000 });
    expect(found.bytes).toBeLessThanOrEqual(50_000);
  });
});
