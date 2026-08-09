/**
 * Decides where a single conversion runs: in the browser or on the server.
 *
 * The browser is the default and handles almost everything. The server exists
 * only for encoders we genuinely cannot run client-side (currently TIFF, via
 * sharp), and it is hard-capped by Vercel's ~4.5 MB serverless request body
 * limit — so a large file targeting a server-only format cannot be converted at
 * all, and we say so plainly rather than failing with a network error.
 *
 * The rule set lives here, alone, so it can be unit-tested without a browser.
 */

import { FORMATS, type FormatId } from "../formats";

/**
 * Vercel rejects serverless request bodies over ~4.5 MB. We cap at 4 MB so
 * multipart framing and the JSON options blob cannot push a just-legal file
 * over the real limit.
 */
export const SERVER_MAX_BYTES = 4 * 1024 * 1024;

export type Route =
  | { engine: "client" }
  | { engine: "server"; reason: string }
  | { engine: "blocked"; reason: string; suggestion: string | null };

export interface RouteInput {
  from: FormatId;
  to: FormatId;
  /** Size of the source file in bytes. */
  bytes: number;
}

export function routeConversion({ from, to, bytes }: RouteInput): Route {
  const source = FORMATS[from];
  const target = FORMATS[to];

  if (source.decoder === null) {
    return {
      engine: "blocked",
      reason: `${source.label} files cannot be read.`,
      suggestion: null,
    };
  }

  if (target.encoder === null) {
    return {
      engine: "blocked",
      reason: `${target.label} cannot be written.`,
      suggestion: `Try PNG or WebP instead.`,
    };
  }

  if (target.encoder !== "server") {
    return { engine: "client" };
  }

  if (bytes > SERVER_MAX_BYTES) {
    return {
      engine: "blocked",
      reason:
        `${target.label} output runs on the server, which accepts files up to ` +
        `${formatBytes(SERVER_MAX_BYTES)}. This file is ${formatBytes(bytes)}.`,
      suggestion: `Resize it first, or choose PNG — PNG is also lossless and converts in your browser at any size.`,
    };
  }

  return {
    engine: "server",
    reason: `${target.label} encoding is not available in the browser.`,
  };
}

/** True when nothing about this pairing forces an upload. */
export function staysLocal(input: RouteInput): boolean {
  return routeConversion(input).engine === "client";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
