/**
 * Copies codecs that must not go through the bundler into `public/codecs/`.
 *
 * libheif ships as a 1.4 MB minified emscripten bundle with its wasm inlined as
 * base64. Handing that to Turbopack stalls the build for many minutes to
 * produce a file that cannot be meaningfully optimised anyway. Serving it as a
 * static asset and importing it at runtime keeps builds fast and still loads
 * the codec only when someone actually opens a HEIC.
 *
 * Runs from `prebuild` and `predev`, so `public/codecs` is generated, not
 * committed.
 */

import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, "public", "codecs");

/** Resolved through `require.resolve` so a version bump cannot leave a stale path. */
const ASSETS = [
  {
    from: require.resolve("libheif-js/libheif-wasm/libheif-bundle.mjs"),
    to: "libheif-bundle.mjs",
  },
];

await mkdir(destination, { recursive: true });

for (const asset of ASSETS) {
  await copyFile(asset.from, join(destination, asset.to));
  console.log(`copied ${asset.to}`);
}
