/**
 * The narrow server fallback.
 *
 * This route exists for exactly one reason: TIFF encoding. Every other
 * conversion PixelVerse offers runs in the visitor's browser and no bytes leave
 * their machine. Keeping the accepted target list to what genuinely cannot run
 * client-side keeps both the attack surface and the hosting bill near zero.
 *
 * Requests are capped below Vercel's ~4.5 MB serverless body limit; the client
 * router refuses anything larger before it reaches the network, and the check
 * is repeated here because a route must not trust its caller.
 */

import { NextResponse } from "next/server";
import sharp from "sharp";
import { FORMATS, type FormatId } from "@/lib/formats";
import { SERVER_MAX_BYTES } from "@/lib/engine/router";
import { planResize, normalizeCrop } from "@/lib/engine/geometry";
import type { EncodeOptions, ImageOps } from "@/lib/engine/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Derived from the format table, so the two can never drift apart. */
const SERVER_TARGETS = new Set<FormatId>(
  (Object.keys(FORMATS) as FormatId[]).filter((id) => FORMATS[id].encoder === "server"),
);

/** A ceiling on decoded dimensions, so a decompression bomb cannot exhaust memory. */
const MAX_PIXELS = 100_000_000;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "That request was not a readable multipart upload.");
  }

  const file = form.get("file");
  const target = form.get("target");

  if (!(file instanceof File)) return fail(400, "No file was included in the request.");
  if (typeof target !== "string" || !(target in FORMATS)) {
    return fail(400, "That output format is not one PixelVerse knows.");
  }

  const targetId = target as FormatId;
  if (!SERVER_TARGETS.has(targetId)) {
    // Anything else belongs in the browser. Refusing keeps this route from
    // quietly becoming a general-purpose image service.
    return fail(
      400,
      `${FORMATS[targetId].label} is converted in your browser — this endpoint only handles ${[
        ...SERVER_TARGETS,
      ]
        .map((id) => FORMATS[id].label)
        .join(", ")}.`,
    );
  }

  if (file.size > SERVER_MAX_BYTES) {
    return fail(413, `This file is larger than the ${SERVER_MAX_BYTES / 1024 / 1024} MB limit.`);
  }

  let ops: ImageOps;
  let encode: EncodeOptions;
  try {
    ops = JSON.parse(String(form.get("ops") ?? "{}")) as ImageOps;
    encode = JSON.parse(String(form.get("encode") ?? "{}")) as EncodeOptions;
  } catch {
    return fail(400, "The conversion settings could not be read.");
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const { data, info } = await runPipeline(input, ops, encode);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": FORMATS[targetId].mime,
        "Content-Length": String(data.byteLength),
        "x-image-width": String(info.width),
        "x-image-height": String(info.height),
        // Nothing here is cacheable: it is one user's private file.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail(422, `This image could not be converted: ${message}`);
  }
}

/**
 * Mirrors the client pipeline's operation order — crop, rotate, flip, resize,
 * flatten — so a TIFF and a PNG of the same source come out framed identically.
 */
async function runPipeline(input: Buffer, ops: ImageOps, encode: EncodeOptions) {
  const probe = sharp(input, { limitInputPixels: MAX_PIXELS });
  const meta = await probe.metadata();
  if (!meta.width || !meta.height) throw new Error("the image has no readable dimensions");

  let pipeline = sharp(input, { limitInputPixels: MAX_PIXELS });

  const crop = normalizeCrop(meta.width, meta.height, ops.crop ?? null);
  if (crop) {
    pipeline = pipeline.extract({
      left: crop.x,
      top: crop.y,
      width: crop.width,
      height: crop.height,
    });
  }

  let width = crop?.width ?? meta.width;
  let height = crop?.height ?? meta.height;

  if (ops.rotate) {
    pipeline = pipeline.rotate(ops.rotate);
    if (ops.rotate === 90 || ops.rotate === 270) [width, height] = [height, width];
  }
  if (ops.flipH) pipeline = pipeline.flop();
  if (ops.flipV) pipeline = pipeline.flip();

  const plan = planResize(width, height, ops.resize ?? null);
  if (plan.sourceCrop) {
    pipeline = pipeline.extract({
      left: plan.sourceCrop.x,
      top: plan.sourceCrop.y,
      width: plan.sourceCrop.width,
      height: plan.sourceCrop.height,
    });
  }
  if (plan.width !== width || plan.height !== height) {
    pipeline = pipeline.resize(plan.width, plan.height, { fit: "fill", kernel: "lanczos3" });
  }

  if (ops.background) {
    pipeline = pipeline.flatten({ background: ops.background });
  }

  // Deflate is the reason this route exists: it is the difference between a
  // ~6 MB TIFF and the ~48 MB an uncompressed client-side encoder would emit.
  return pipeline
    .tiff({ compression: "deflate", predictor: "horizontal", quality: encode.quality ?? 90 })
    .toBuffer({ resolveWithObject: true });
}
