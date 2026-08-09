import { describe, expect, it } from "vitest";
import { sniff } from "./sniff";

function bytes(...values: (number | string)[]): Uint8Array {
  const out: number[] = [];
  for (const value of values) {
    if (typeof value === "number") out.push(value);
    else for (const char of value) out.push(char.charCodeAt(0));
  }
  return new Uint8Array(out);
}

function pad(base: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  out.set(base);
  return out;
}

/** A minimal ISO base-media header: size, "ftyp", major brand, compatibles. */
function isoHeader(major: string, ...compatible: string[]): Uint8Array {
  const size = 16 + compatible.length * 4;
  return bytes(0, 0, 0, size, "ftyp", major, 0, 0, 0, 0, ...compatible);
}

describe("sniff", () => {
  it("returns null for too-short input", () => {
    expect(sniff(new Uint8Array([0xff]))).toBeNull();
  });

  it("returns null for something that is not an image", () => {
    expect(sniff(bytes("this is just some text file"))).toBeNull();
  });

  it("detects JPEG", () => {
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ format: "jpeg", animated: false });
  });

  it("detects PNG", () => {
    expect(sniff(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      format: "png",
      animated: false,
    });
  });

  it("detects BMP", () => {
    expect(sniff(bytes("BM", 0, 0, 0, 0))?.format).toBe("bmp");
  });

  it("detects both TIFF byte orders", () => {
    expect(sniff(bytes("II", 0x2a, 0x00))?.format).toBe("tiff");
    expect(sniff(bytes("MM", 0x00, 0x2a))?.format).toBe("tiff");
  });

  it("detects ICO but not a run of zero bytes", () => {
    expect(sniff(bytes(0, 0, 1, 0, 1, 0))?.format).toBe("ico");
    // An ICO claiming zero images is not an ICO.
    expect(sniff(bytes(0, 0, 1, 0, 0, 0))).toBeNull();
  });

  it("detects PDF", () => {
    expect(sniff(bytes("%PDF-1.7"))?.format).toBe("pdf");
  });

  describe("ISO base-media formats", () => {
    it("detects AVIF", () => {
      expect(sniff(isoHeader("avif", "mif1", "miaf"))).toEqual({
        format: "avif",
        animated: false,
      });
    });

    it("detects an AVIF image sequence as animated", () => {
      expect(sniff(isoHeader("avis", "avif", "msf1"))).toEqual({
        format: "avif",
        animated: true,
      });
    });

    it("detects HEIC", () => {
      expect(sniff(isoHeader("heic", "mif1"))).toEqual({ format: "heic", animated: false });
    });

    it("prefers AVIF when a file claims both brands", () => {
      // Real AVIF files list mif1 as a compatible brand; checking HEIC first
      // would misidentify every one of them.
      expect(sniff(isoHeader("mif1", "avif"))?.format).toBe("avif");
    });

    it("falls back to HEIC for a bare mif1 file", () => {
      expect(sniff(isoHeader("mif1"))?.format).toBe("heic");
    });
  });

  describe("JPEG XL", () => {
    it("detects a naked codestream", () => {
      expect(sniff(bytes(0xff, 0x0a, 0x00, 0x00))?.format).toBe("jxl");
    });

    it("detects the ISO container", () => {
      const container = bytes(0x00, 0x00, 0x00, 0x0c, "JXL ", 0x0d, 0x0a, 0x87, 0x0a);
      expect(sniff(container)?.format).toBe("jxl");
    });
  });

  describe("WebP", () => {
    it("detects a still WebP", () => {
      const still = bytes("RIFF", 0, 0, 0, 0, "WEBP", "VP8 ");
      expect(sniff(still)).toEqual({ format: "webp", animated: false });
    });

    it("detects an animated WebP via the VP8X flag", () => {
      // VP8X chunk: fourcc, size, then a flags byte with bit 1 set.
      const animated = bytes("RIFF", 0, 0, 0, 0, "WEBP", "VP8X", 10, 0, 0, 0, 0x02);
      expect(sniff(animated)).toEqual({ format: "webp", animated: true });
    });

    it("does not call a VP8X-without-animation-flag file animated", () => {
      const stillWithAlpha = bytes("RIFF", 0, 0, 0, 0, "WEBP", "VP8X", 10, 0, 0, 0, 0x10);
      expect(sniff(stillWithAlpha)).toEqual({ format: "webp", animated: false });
    });
  });

  describe("GIF", () => {
    /**
     * Builds a GIF with `frameCount` image descriptors and no colour tables,
     * exercising the real block walk rather than a byte scan.
     */
    function gif(frameCount: number): Uint8Array {
      const out: number[] = [];
      for (const char of "GIF89a") out.push(char.charCodeAt(0));
      out.push(1, 0, 1, 0, 0x00, 0, 0); // 1x1, no global colour table

      for (let i = 0; i < frameCount; i++) {
        // Graphic control extension, so the walker must skip extensions too.
        out.push(0x21, 0xf9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00);
        // Image descriptor: 1x1 at 0,0, no local colour table.
        out.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00);
        out.push(0x02); // LZW minimum code size
        out.push(0x02, 0x44, 0x01, 0x00); // one data sub-block, then terminator
      }
      out.push(0x3b); // trailer
      return new Uint8Array(out);
    }

    it("detects GIF87a and GIF89a", () => {
      expect(sniff(pad(bytes("GIF87a"), 32))?.format).toBe("gif");
      expect(sniff(pad(bytes("GIF89a"), 32))?.format).toBe("gif");
    });

    it("reports a single-frame GIF as still", () => {
      expect(sniff(gif(1))).toEqual({ format: "gif", animated: false });
    });

    it("reports a multi-frame GIF as animated", () => {
      expect(sniff(gif(2))).toEqual({ format: "gif", animated: true });
      expect(sniff(gif(12))).toEqual({ format: "gif", animated: true });
    });

    it("does not mistake 0x2c inside a colour table for a second frame", () => {
      // A global colour table stuffed with 0x2c bytes — the exact false
      // positive a naive scan produces.
      const out: number[] = [];
      for (const char of "GIF89a") out.push(char.charCodeAt(0));
      out.push(1, 0, 1, 0, 0x80, 0, 0); // global colour table, 2 entries
      out.push(0x2c, 0x2c, 0x2c, 0x2c, 0x2c, 0x2c);
      out.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00);
      out.push(0x3b);
      expect(sniff(new Uint8Array(out))).toEqual({ format: "gif", animated: false });
    });
  });

  describe("SVG", () => {
    it("detects a bare svg element", () => {
      expect(sniff(bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))?.format).toBe("svg");
    });

    it("detects svg behind an XML declaration and a doctype", () => {
      const withPreamble =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd">\n' +
        "<svg><rect/></svg>";
      expect(sniff(bytes(withPreamble))?.format).toBe("svg");
    });

    it("detects svg after a UTF-8 BOM and leading whitespace", () => {
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const body = bytes("\n  <svg></svg>");
      const combined = new Uint8Array(bom.length + body.length);
      combined.set(bom);
      combined.set(body, bom.length);
      expect(sniff(combined)?.format).toBe("svg");
    });

    it("does not match HTML that merely mentions svg", () => {
      expect(sniff(bytes("<html><body>read about svg here</body></html>"))).toBeNull();
    });
  });
});
