/**
 * Output filename patterns for batch conversion.
 *
 * Renaming 40 files by hand after a batch is exactly the chore this app should
 * remove, so the pattern is part of the conversion rather than an afterthought.
 */

import { extensionFor, type FormatId } from "./formats";

export interface NameContext {
  /** Original filename, extension included. */
  original: string;
  target: FormatId;
  /** 1-based position in the queue. */
  index: number;
  total: number;
  width: number;
  height: number;
}

export const DEFAULT_NAME_PATTERN = "{name}";

export interface NameToken {
  token: string;
  description: string;
}

/** Shown as clickable chips under the pattern field. */
export const NAME_TOKENS: NameToken[] = [
  { token: "{name}", description: "Original filename, without its extension" },
  { token: "{ext}", description: "New file extension" },
  { token: "{index}", description: "Position in the batch, zero-padded" },
  { token: "{w}", description: "Output width in pixels" },
  { token: "{h}", description: "Output height in pixels" },
  { token: "{date}", description: "Today, as YYYY-MM-DD" },
];

/**
 * Characters Windows rejects in a filename, plus C0 control codes.
 * Spaces and hyphens are deliberately left alone — they are legal everywhere,
 * and rewriting them would mangle names the user never asked us to touch.
 */
const ILLEGAL = new RegExp("[<>:\"/\\\\|?*\\u0000-\\u001f]", "g");

/** Windows refuses these names outright, with or without an extension. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

/**
 * Makes a string safe to write to disk on any OS.
 * Deliberately conservative: a name that survives the download but breaks a
 * later script is worse than one that looks slightly sanitised.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(ILLEGAL, "_")
    // Windows silently drops trailing dots and spaces, which makes "photo."
    // and "photo" collide.
    .replace(/[. ]+$/, "")
    .trim();

  if (cleaned === "") return "image";
  if (RESERVED.test(cleaned)) return `_${cleaned}`;
  return cleaned;
}

/**
 * Expands a pattern into a filename.
 * Unknown `{tokens}` are left alone rather than blanked, so a typo shows up in
 * the preview instead of quietly deleting part of the name.
 */
export function applyNamePattern(pattern: string, context: NameContext): string {
  const extension = extensionFor(context.target);
  // Pad to the width of the batch so 100 files sort correctly in a file manager.
  const padding = String(context.total).length;

  const replacements: Record<string, string> = {
    "{name}": stripExtension(context.original),
    "{ext}": extension,
    "{index}": String(context.index).padStart(padding, "0"),
    "{w}": String(context.width),
    "{h}": String(context.height),
    "{date}": new Date().toISOString().slice(0, 10),
  };

  const expanded = pattern.replace(
    /\{(?:name|ext|index|w|h|date)\}/g,
    (token) => replacements[token] ?? token,
  );

  const base = sanitizeFilename(expanded === "" ? stripExtension(context.original) : expanded);

  // Appending the extension ourselves means a pattern that uses {ext} mid-name
  // still produces a file the OS opens correctly.
  return base.toLowerCase().endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}

/**
 * Appends " (2)", " (3)" and so on to names already taken.
 * ZIP entries with duplicate paths silently overwrite each other, so a batch
 * containing two files called `photo.png` would otherwise lose one.
 */
export function deduplicateNames(names: string[]): string[] {
  const seen = new Map<string, number>();

  return names.map((name) => {
    const key = name.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return name;

    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    return `${stem} (${count + 1})${extension}`;
  });
}
