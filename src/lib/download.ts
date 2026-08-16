"use client";

/**
 * Saving results to disk.
 *
 * Downloads are triggered from a synthetic anchor click rather than
 * `window.open`, which pop-up blockers treat with suspicion when several fire
 * in a row.
 */

import { deduplicateNames } from "./rename";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // Revoking immediately can cancel the download in Safari; one turn of the
  // event loop is enough for the browser to have taken its own reference.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ZipEntry {
  blob: Blob;
  filename: string;
}

/**
 * Bundles results into a ZIP.
 *
 * Stored rather than deflated: everything in here is already-compressed image
 * data, so deflate would spend real time to save a fraction of a percent.
 */
export async function downloadZip(
  entries: ZipEntry[],
  zipName: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const names = deduplicateNames(entries.map((entry) => entry.filename));
  entries.forEach((entry, index) => {
    zip.file(names[index], entry.blob);
  });

  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (meta) =>
    onProgress?.(meta.percent),
  );

  downloadBlob(blob, zipName);
}
