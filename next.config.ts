import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native addon — it must never be bundled, only required at runtime
  // by the /api/convert route. Used exclusively for TIFF encoding.
  serverExternalPackages: ["sharp"],

  // NOTE — `npm run build` passes `--webpack` on purpose.
  //
  // Turbopack (16.3.0) never finishes `next build` for this project: it hangs
  // after "Creating an optimized production build", with the postcss worker and
  // the main process both parked in ep_poll and nothing further written to
  // .next. Bisected to the module worker in lib/engine/client/pool.ts —
  // `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })` —
  // whose dependency graph reaches ~22 MB of dynamically imported wasm codecs
  // (@jsquash/avif 8.1 MB, @jsquash/jxl 5.7 MB, libheif-js 6.2 MB).
  //
  // Evidence: a bare Next 16 app builds in 11 s; this app with page.tsx reduced
  // to a stub (engine tree unreferenced) compiles in 5.6 s; the full app under
  // Turbopack exceeds 168 s with no progress; the full app under webpack builds
  // in 9.5 s; the full app under Turbopack with only that `new URL(...)` worker
  // reference replaced by a string path builds in 6.3 s.
  //
  // `next dev` still uses Turbopack and is unaffected — only the production
  // build is routed to webpack. Retry `npm run build:turbopack` after a Next
  // upgrade; when it completes, delete this note and drop the flag.

  // The @jsquash codecs load their .wasm siblings via `new URL(..., import.meta.url)`.
  // Both webpack and Turbopack understand that as an asset reference, so no loader
  // config is needed — but the codecs are ESM-only, so keep them out of any
  // transpile/optimize passes that would rewrite the import.meta.url.
  transpilePackages: [],
};

export default nextConfig;
