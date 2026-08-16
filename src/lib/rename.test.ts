import { describe, expect, it } from "vitest";
import {
  applyNamePattern,
  deduplicateNames,
  sanitizeFilename,
  stripExtension,
  type NameContext,
} from "./rename";

const context = (overrides: Partial<NameContext> = {}): NameContext => ({
  original: "holiday photo.HEIC",
  target: "webp",
  index: 1,
  total: 1,
  width: 1920,
  height: 1080,
  ...overrides,
});

describe("stripExtension", () => {
  it("removes a trailing extension", () => {
    expect(stripExtension("photo.jpg")).toBe("photo");
  });

  it("only removes the last extension", () => {
    expect(stripExtension("archive.tar.gz")).toBe("archive.tar");
  });

  it("leaves an extensionless name alone", () => {
    expect(stripExtension("photo")).toBe("photo");
  });

  it("does not treat a leading dot as an extension", () => {
    expect(stripExtension(".gitignore")).toBe(".gitignore");
  });
});

describe("sanitizeFilename", () => {
  it("keeps spaces and hyphens, which are legal everywhere", () => {
    expect(sanitizeFilename("my holiday photo-2")).toBe("my holiday photo-2");
  });

  it("replaces characters Windows rejects", () => {
    expect(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j')).toBe("a_b_c_d_e_f_g_h_i_j");
  });

  it("strips trailing dots and spaces that Windows would drop anyway", () => {
    expect(sanitizeFilename("photo.  ")).toBe("photo");
  });

  it("escapes reserved device names", () => {
    // "con.webp" is unwritable on Windows however the extension is spelled.
    expect(sanitizeFilename("con")).toBe("_con");
    expect(sanitizeFilename("COM1")).toBe("_COM1");
  });

  it("falls back to a usable name when nothing survives", () => {
    expect(sanitizeFilename("")).toBe("image");
    expect(sanitizeFilename("...")).toBe("image");
  });
});

describe("applyNamePattern", () => {
  it("defaults to the original stem with the new extension", () => {
    expect(applyNamePattern("{name}", context())).toBe("holiday photo.webp");
  });

  it("substitutes dimensions", () => {
    expect(applyNamePattern("{name}-{w}x{h}", context())).toBe("holiday photo-1920x1080.webp");
  });

  it("zero-pads the index to the width of the batch", () => {
    expect(applyNamePattern("{index}-{name}", context({ index: 7, total: 120 }))).toBe(
      "007-holiday photo.webp",
    );
  });

  it("does not pad when the batch is small", () => {
    expect(applyNamePattern("{index}", context({ index: 3, total: 9 }))).toBe("3.webp");
  });

  it("substitutes a date that looks like a date", () => {
    expect(applyNamePattern("{date}", context())).toMatch(/^\d{4}-\d{2}-\d{2}\.webp$/);
  });

  it("appends the extension exactly once when the pattern already ends with it", () => {
    expect(applyNamePattern("{name}.{ext}", context())).toBe("holiday photo.webp");
  });

  it("still appends the extension when {ext} appears mid-name", () => {
    expect(applyNamePattern("{ext}-{name}", context())).toBe("webp-holiday photo.webp");
  });

  it("leaves an unknown token visible rather than deleting it", () => {
    // A silent deletion would look like the pattern worked.
    expect(applyNamePattern("{nmae}", context())).toBe("{nmae}.webp");
  });

  it("falls back to the original stem for an empty pattern", () => {
    expect(applyNamePattern("", context())).toBe("holiday photo.webp");
  });

  it("sanitises what the pattern expands to", () => {
    expect(applyNamePattern("{name}", context({ original: "a/b:c.png" }))).toBe("a_b_c.webp");
  });

  it("uses the target format's extension, not the source's", () => {
    expect(applyNamePattern("{name}", context({ target: "jpeg" }))).toBe("holiday photo.jpg");
  });
});

describe("deduplicateNames", () => {
  it("leaves distinct names alone", () => {
    expect(deduplicateNames(["a.webp", "b.webp"])).toEqual(["a.webp", "b.webp"]);
  });

  it("numbers repeats so ZIP entries cannot overwrite each other", () => {
    expect(deduplicateNames(["photo.webp", "photo.webp", "photo.webp"])).toEqual([
      "photo.webp",
      "photo (2).webp",
      "photo (3).webp",
    ]);
  });

  it("treats names differing only in case as duplicates", () => {
    // Windows and macOS filesystems are case-insensitive by default.
    expect(deduplicateNames(["Photo.webp", "photo.webp"])).toEqual([
      "Photo.webp",
      "photo (2).webp",
    ]);
  });

  it("inserts the counter before the extension", () => {
    const [, second] = deduplicateNames(["a.tar.gz", "a.tar.gz"]);
    expect(second).toBe("a.tar (2).gz");
  });

  it("handles names with no extension", () => {
    expect(deduplicateNames(["photo", "photo"])).toEqual(["photo", "photo (2)"]);
  });
});
