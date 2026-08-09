/**
 * The single source of truth for every format PixelVerse understands.
 *
 * Everything else — the input sniffer, the output dropdown, the client/server
 * router, the worker's decode and encode switches — reads from this table.
 * Adding a format means adding one entry here plus its codec function; nothing
 * else in the app enumerates formats.
 */

export type FormatId =
  | "jpeg"
  | "png"
  | "webp"
  | "avif"
  | "jxl"
  | "gif"
  | "bmp"
  | "tiff"
  | "ico"
  | "svg"
  | "heic"
  | "pdf";

/**
 * How a format's bytes become pixels.
 *
 * `bitmap` means we hand the bytes to the browser itself (an `<img>` element or
 * `createImageBitmap`). That only works on the main thread for some of these —
 * notably SVG, which Chrome refuses to decode inside a worker — so every
 * `bitmap` format is decoded on the main thread and enters the worker as raw
 * `ImageData`. See `decodesOnMainThread`.
 */
export type DecoderKind = "jsquash" | "bitmap" | "heic" | "tiff" | "pdf";

/** How pixels become a format's bytes. */
export type EncoderKind =
  | "jsquash"
  | "bmp"
  | "gif"
  | "ico"
  | "svg"
  | "pdf"
  | "server";

export interface QualityRange {
  min: number;
  max: number;
  default: number;
  /** Shown under the slider so the number means something to the user. */
  hint: string;
}

export interface FormatSpec {
  id: FormatId;
  label: string;
  /** Canonical MIME type, also used for Blob construction on download. */
  mime: string;
  /** First entry is the extension we write on output. */
  extensions: string[];
  /** `null` means we cannot read this format (yet). */
  decoder: DecoderKind | null;
  /** `null` means we cannot write this format (yet). */
  encoder: EncoderKind | null;
  /** Whether the encoder can carry an alpha channel through. */
  alpha: boolean;
  /** Whether the container can hold more than one frame. */
  animation: boolean;
  /** `null` for formats with no lossy quality knob (PNG, BMP, ICO...). */
  quality: QualityRange | null;
  /** Whether a "lossless" toggle applies (WebP, AVIF, JXL). */
  lossless: boolean;
  /** One line for the format picker tooltip. */
  blurb: string;
}

const FORMAT_LIST: FormatSpec[] = [
  {
    id: "jpeg",
    label: "JPEG",
    mime: "image/jpeg",
    extensions: ["jpg", "jpeg", "jpe", "jfif"],
    decoder: "jsquash",
    encoder: "jsquash",
    alpha: false,
    animation: false,
    quality: { min: 1, max: 100, default: 82, hint: "82 is visually lossless for most photos" },
    lossless: false,
    blurb: "Universal photo format. No transparency.",
  },
  {
    id: "png",
    label: "PNG",
    mime: "image/png",
    extensions: ["png"],
    decoder: "jsquash",
    encoder: "jsquash",
    alpha: true,
    animation: false,
    quality: null,
    lossless: true,
    blurb: "Lossless with transparency. Large for photos.",
  },
  {
    id: "webp",
    label: "WebP",
    mime: "image/webp",
    extensions: ["webp"],
    decoder: "jsquash",
    encoder: "jsquash",
    alpha: true,
    animation: true,
    quality: { min: 1, max: 100, default: 80, hint: "~30% smaller than JPEG at equal quality" },
    lossless: true,
    blurb: "Best all-round choice for the web today.",
  },
  {
    id: "avif",
    label: "AVIF",
    mime: "image/avif",
    extensions: ["avif"],
    decoder: "jsquash",
    encoder: "jsquash",
    alpha: true,
    animation: true,
    quality: { min: 1, max: 100, default: 60, hint: "AVIF 60 ≈ JPEG 85 — lower numbers are normal here" },
    lossless: true,
    blurb: "Smallest files, slower to encode.",
  },
  {
    id: "jxl",
    label: "JPEG XL",
    mime: "image/jxl",
    extensions: ["jxl"],
    decoder: "jsquash",
    encoder: "jsquash",
    alpha: true,
    animation: true,
    quality: { min: 1, max: 100, default: 75, hint: "Excellent quality per byte; limited browser support" },
    lossless: true,
    blurb: "Modern successor to JPEG. Not yet widely supported.",
  },
  {
    id: "gif",
    label: "GIF",
    mime: "image/gif",
    extensions: ["gif"],
    decoder: "bitmap",
    encoder: "gif",
    alpha: true,
    animation: true,
    quality: null,
    lossless: false,
    blurb: "256 colours. Use WebP instead unless you need GIF.",
  },
  {
    id: "bmp",
    label: "BMP",
    mime: "image/bmp",
    extensions: ["bmp"],
    decoder: "bitmap",
    encoder: "bmp",
    alpha: true,
    animation: false,
    quality: null,
    lossless: true,
    blurb: "Uncompressed bitmap. Very large files.",
  },
  {
    id: "tiff",
    label: "TIFF",
    mime: "image/tiff",
    extensions: ["tiff", "tif"],
    decoder: "tiff",
    encoder: "server",
    alpha: true,
    animation: false,
    quality: null,
    lossless: true,
    blurb: "Print and archival. Encoding runs on the server.",
  },
  {
    id: "ico",
    label: "ICO",
    mime: "image/x-icon",
    extensions: ["ico"],
    decoder: "bitmap",
    encoder: "ico",
    alpha: true,
    animation: false,
    quality: null,
    lossless: true,
    blurb: "Windows/favicon container. Can hold several sizes.",
  },
  {
    id: "svg",
    label: "SVG",
    mime: "image/svg+xml",
    extensions: ["svg"],
    decoder: "bitmap",
    // TODO(vectorize): flip to "svg" once the imagetracer path lands.
    encoder: null,
    alpha: true,
    animation: false,
    quality: null,
    lossless: true,
    blurb: "Vector. Read as pixels at high resolution.",
  },
  {
    id: "heic",
    label: "HEIC",
    mime: "image/heic",
    extensions: ["heic", "heif"],
    decoder: "heic",
    encoder: null,
    alpha: true,
    animation: false,
    quality: null,
    lossless: false,
    blurb: "Apple photo format. Read-only — patent-encumbered to write.",
  },
  {
    id: "pdf",
    label: "PDF",
    mime: "application/pdf",
    extensions: ["pdf"],
    // TODO(pdf): flip to "pdf" on both sides once pdfjs/pdf-lib are wired in.
    decoder: null,
    encoder: null,
    alpha: false,
    animation: false,
    quality: null,
    lossless: true,
    blurb: "Each page in, one page per image out.",
  },
];

export const FORMATS: Readonly<Record<FormatId, FormatSpec>> = Object.freeze(
  Object.fromEntries(FORMAT_LIST.map((f) => [f.id, f])) as Record<FormatId, FormatSpec>,
);

export const ALL_FORMATS: readonly FormatSpec[] = Object.freeze(FORMAT_LIST);

export function getFormat(id: FormatId): FormatSpec {
  return FORMATS[id];
}

/** Formats we can read. Drives what the dropzone accepts. */
export function decodableFormats(): FormatSpec[] {
  return FORMAT_LIST.filter((f) => f.decoder !== null);
}

/** Formats we can write. Drives the output picker. */
export function encodableFormats(): FormatSpec[] {
  return FORMAT_LIST.filter((f) => f.encoder !== null);
}

export function canDecode(id: FormatId): boolean {
  return FORMATS[id].decoder !== null;
}

export function canEncode(id: FormatId): boolean {
  return FORMATS[id].encoder !== null;
}

/**
 * True when the browser must decode this format itself, on the main thread,
 * before the worker can touch it. See `DecoderKind`.
 */
export function decodesOnMainThread(id: FormatId): boolean {
  const kind = FORMATS[id].decoder;
  return kind === "bitmap" || kind === "pdf";
}

/**
 * The `accept` value for the file input, e.g. `image/png,.png,image/jpeg,.jpg`.
 * Extensions are included because Windows frequently reports an empty MIME type
 * for the less common formats.
 */
export function dropzoneAccept(): Record<string, string[]> {
  const accept: Record<string, string[]> = {};
  for (const f of decodableFormats()) {
    accept[f.mime] = f.extensions.map((e) => `.${e}`);
  }
  return accept;
}

/** Human-readable list for the empty-state hint. */
export function decodableLabels(): string {
  return decodableFormats()
    .map((f) => f.label)
    .join(", ");
}

export function extensionFor(id: FormatId): string {
  return FORMATS[id].extensions[0];
}

/**
 * Swap a filename's extension for the target format's.
 * `photo.heic` + `webp` -> `photo.webp`
 */
export function renameToFormat(filename: string, id: FormatId): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  return `${stem}.${extensionFor(id)}`;
}

/**
 * Why a given conversion is not offered, or `null` if it is fine.
 * The UI shows this as the tooltip on a disabled option, so it is phrased for
 * a user, not a developer.
 */
export function conversionBlockedReason(from: FormatId, to: FormatId): string | null {
  const source = FORMATS[from];
  const target = FORMATS[to];
  if (source.decoder === null) return `${source.label} files cannot be read yet.`;
  if (target.encoder === null) return `${target.label} output is not supported.`;
  return null;
}
