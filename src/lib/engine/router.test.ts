import { describe, expect, it } from "vitest";
import { formatBytes, routeConversion, SERVER_MAX_BYTES, staysLocal } from "./router";

const MB = 1024 * 1024;

describe("routeConversion", () => {
  it("keeps ordinary conversions in the browser", () => {
    expect(routeConversion({ from: "jpeg", to: "webp", bytes: 500_000 })).toEqual({
      engine: "client",
    });
  });

  it("keeps huge files in the browser when the target is client-encodable", () => {
    // The whole point of client-first: no size ceiling at all.
    expect(routeConversion({ from: "png", to: "webp", bytes: 500 * MB })).toEqual({
      engine: "client",
    });
  });

  it("keeps HEIC decoding in the browser", () => {
    // libheif-js runs in the worker, so iPhone photos never leave the device.
    expect(staysLocal({ from: "heic", to: "jpeg", bytes: 3 * MB })).toBe(true);
  });

  it("sends server-only encoders to the server when small enough", () => {
    const route = routeConversion({ from: "png", to: "tiff", bytes: 2 * MB });
    expect(route.engine).toBe("server");
  });

  it("accepts a file sitting exactly on the server limit", () => {
    expect(routeConversion({ from: "png", to: "tiff", bytes: SERVER_MAX_BYTES }).engine).toBe(
      "server",
    );
  });

  it("blocks one byte over the server limit rather than letting the upload fail", () => {
    const route = routeConversion({ from: "png", to: "tiff", bytes: SERVER_MAX_BYTES + 1 });
    expect(route.engine).toBe("blocked");
    if (route.engine !== "blocked") throw new Error("unreachable");
    expect(route.reason).toContain("4 MB");
    expect(route.suggestion).toContain("PNG");
  });

  it("blocks formats we cannot write, and says what to use instead", () => {
    const route = routeConversion({ from: "png", to: "heic", bytes: 1000 });
    expect(route.engine).toBe("blocked");
    if (route.engine !== "blocked") throw new Error("unreachable");
    expect(route.suggestion).toBeTruthy();
  });

  it("blocks HEIC as a target even though it is a valid source", () => {
    // HEIC is read-only for us; the asymmetry is easy to break when editing
    // the format table, so pin it.
    const route = routeConversion({ from: "heic", to: "heic", bytes: 1000 });
    expect(route.engine).toBe("blocked");
    if (route.engine !== "blocked") throw new Error("unreachable");
    expect(route.reason).toContain("cannot be written");
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [4 * MB, "4 MB"],
    [10 * MB, "10 MB"],
    [1536 * 1024, "1.5 MB"],
  ])("renders %i as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
