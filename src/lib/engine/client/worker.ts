/**
 * The conversion worker.
 *
 * One job in, one encoded image out. Everything expensive — wasm instantiation,
 * pixel loops, the target-size search — happens here so the UI thread stays
 * responsive while a batch runs.
 *
 * Exposed over Comlink, so `pool.ts` calls `convert()` as if it were local.
 */

import * as Comlink from "comlink";
import pako from "pako";
import { FORMATS } from "../../formats";
import { searchQualityForSize } from "../target-size";
import type { WorkerJob, WorkerResult } from "../types";
import { decodeToImageData } from "./decode";
import { encodeImage } from "./encode";
import { applyOps } from "./ops";

// UTIF reaches for pako through a bare `require` or a global, depending on how
// it was loaded. Bundlers usually satisfy the former, but planting the global
// too means Deflate-compressed TIFFs cannot fail on a resolution technicality.
(self as unknown as { pako: typeof pako }).pako = pako;

async function convert(job: WorkerJob): Promise<WorkerResult> {
  const target = FORMATS[job.target];

  const source =
    job.source.kind === "pixels"
      ? new ImageData(
          new Uint8ClampedArray(job.source.pixels.data),
          job.source.pixels.width,
          job.source.pixels.height,
        )
      : await decodeToImageData(job.source.bytes, job.source.format);

  const image = await applyOps(source, job.ops, { targetSupportsAlpha: target.alpha });

  let bytes: ArrayBuffer;
  let qualityUsed: number | null = target.quality ? job.encode.quality : null;
  let targetMissed = false;

  // A size budget only means something for formats with a quality knob; for
  // PNG or BMP there is nothing to trade away, so we just encode once.
  if (job.encode.targetBytes !== null && target.quality) {
    const found = await searchQualityForSize(
      async (quality) => {
        const encoded = await encodeImage(image, job.target, { ...job.encode, quality });
        return { result: encoded, bytes: encoded.byteLength };
      },
      {
        targetBytes: job.encode.targetBytes,
        min: target.quality.min,
        max: target.quality.max,
      },
    );
    bytes = found.result;
    qualityUsed = found.quality;
    targetMissed = !found.met;
  } else {
    bytes = await encodeImage(image, job.target, job.encode);
  }

  const result: WorkerResult = {
    bytes,
    mime: target.mime,
    width: image.width,
    height: image.height,
    qualityUsed,
    targetMissed,
  };

  // Hand the buffer over rather than copying it — a 50 MP image is ~200 MB of
  // pixels, and structured cloning that per file would dominate the runtime.
  return Comlink.transfer(result, [bytes]);
}

const api = { convert };

export type ConvertWorkerApi = typeof api;

Comlink.expose(api);
