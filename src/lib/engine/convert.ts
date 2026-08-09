/**
 * The one function the UI calls to convert a file.
 *
 * It owns the whole path: identify the input, decide which engine runs it,
 * decode natively if the worker cannot, and hand back encoded bytes plus enough
 * detail for the UI to explain what happened.
 */

import { decodesOnMainThread, FORMATS, type FormatId } from "../formats";
import { sniffFile } from "../sniff";
import { decodeWithBrowser } from "./client/bitmap";
import { getPool } from "./client/pool";
import { routeConversion, type Route } from "./router";
import type { EncodeOptions, ImageOps, JobSource } from "./types";

export interface ConvertRequest {
  file: File;
  target: FormatId;
  ops: ImageOps;
  encode: EncodeOptions;
}

export interface ConvertOutcome {
  blob: Blob;
  /** Source format as detected from the bytes, not the filename. */
  from: FormatId;
  to: FormatId;
  width: number;
  height: number;
  /** Which engine actually ran it — surfaced in the UI as a badge. */
  engine: "client" | "server";
  qualityUsed: number | null;
  targetMissed: boolean;
}

/**
 * Thrown for problems the user can act on: an unreadable file, an unsupported
 * pairing, a file too large for the server leg. Carries a suggestion where one
 * exists so the UI does not have to invent advice.
 */
export class ConversionError extends Error {
  readonly suggestion: string | null;

  constructor(message: string, suggestion: string | null = null) {
    super(message);
    this.name = "ConversionError";
    this.suggestion = suggestion;
  }
}

/** Identifies a file from its content, failing loudly if we cannot read it. */
export async function identify(file: File): Promise<FormatId> {
  const sniffed = await sniffFile(file);
  if (!sniffed) {
    throw new ConversionError(
      `“${file.name}” is not an image format PixelVerse recognises.`,
      "Supported inputs are JPEG, PNG, WebP, AVIF, JPEG XL, GIF, BMP, TIFF, ICO, SVG and HEIC.",
    );
  }
  if (FORMATS[sniffed.format].decoder === null) {
    throw new ConversionError(`${FORMATS[sniffed.format].label} files cannot be read yet.`, null);
  }
  return sniffed.format;
}

export async function convertFile(request: ConvertRequest): Promise<ConvertOutcome> {
  const from = await identify(request.file);
  const route = routeConversion({ from, to: request.target, bytes: request.file.size });

  if (route.engine === "blocked") {
    throw new ConversionError(route.reason, route.suggestion);
  }

  return route.engine === "server"
    ? convertOnServer(request, from, route)
    : convertInBrowser(request, from);
}

async function convertInBrowser(
  request: ConvertRequest,
  from: FormatId,
): Promise<ConvertOutcome> {
  // Formats only the browser can read are decoded here; everything else goes
  // into the worker as raw bytes so the main thread never touches a codec.
  const source: JobSource = decodesOnMainThread(from)
    ? { kind: "pixels", pixels: await decodeWithBrowser(request.file, from === "svg") }
    : { kind: "bytes", bytes: await request.file.arrayBuffer(), format: from };

  const result = await getPool().convert({
    source,
    target: request.target,
    ops: request.ops,
    encode: request.encode,
  });

  return {
    blob: new Blob([result.bytes], { type: result.mime }),
    from,
    to: request.target,
    width: result.width,
    height: result.height,
    engine: "client",
    qualityUsed: result.qualityUsed,
    targetMissed: result.targetMissed,
  };
}

async function convertOnServer(
  request: ConvertRequest,
  from: FormatId,
  route: Extract<Route, { engine: "server" }>,
): Promise<ConvertOutcome> {
  const body = new FormData();
  body.append("file", request.file);
  body.append("target", request.target);
  body.append("ops", JSON.stringify(request.ops));
  body.append("encode", JSON.stringify(request.encode));

  const response = await fetch("/api/convert", { method: "POST", body });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((json: { error?: string }) => json.error)
      .catch(() => null);
    throw new ConversionError(
      detail ?? `The server could not convert this file (${response.status}).`,
      route.reason,
    );
  }

  const blob = await response.blob();
  return {
    blob,
    from,
    to: request.target,
    width: Number(response.headers.get("x-image-width")) || 0,
    height: Number(response.headers.get("x-image-height")) || 0,
    engine: "server",
    qualityUsed: null,
    targetMissed: false,
  };
}
