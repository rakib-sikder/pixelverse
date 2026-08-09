import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native addon — it must never be bundled, only required at runtime
  // by the /api/convert route. Used exclusively for TIFF encoding.
  serverExternalPackages: ["sharp"],

  // The @jsquash codecs load their .wasm siblings via `new URL(..., import.meta.url)`.
  // Both webpack and Turbopack understand that as an asset reference, so no loader
  // config is needed — but the codecs are ESM-only, so keep them out of any
  // transpile/optimize passes that would rewrite the import.meta.url.
  transpilePackages: [],
};

export default nextConfig;
