"use client";

/**
 * The queue and its settings.
 *
 * Two rules shape this store, and both are easier to keep than to retrofit:
 *
 * 1. The original `File` is never replaced or mutated. Re-converting always
 *    starts from the source bytes, so nudging the quality slider ten times does
 *    not compound ten generations of lossy encoding.
 * 2. Every setting can be overridden per file. The UI for that lands later, but
 *    the data model carries it from the start — bolting it on afterwards means
 *    rewriting every consumer.
 */

import { create } from "zustand";
import { FORMATS, type FormatId } from "@/lib/formats";
import { ConversionError, convertFile, identify } from "@/lib/engine/convert";
import { routeConversion } from "@/lib/engine/router";
import { terminatePool } from "@/lib/engine/client/pool";
import { DEFAULT_OPS, NEUTRAL_FILTERS, type EncodeOptions, type ImageOps } from "@/lib/engine/types";
import { applyNamePattern, DEFAULT_NAME_PATTERN } from "@/lib/rename";

export type ItemStatus = "queued" | "converting" | "done" | "error";

export interface ConversionResult {
  blob: Blob;
  /** Object URL for the preview — revoked when the result is replaced. */
  url: string;
  width: number;
  height: number;
  engine: "client" | "server";
  qualityUsed: number | null;
  targetMissed: boolean;
}

export interface QueueItem {
  id: string;
  file: File;
  /** Detected from content when the file was added; null if unreadable. */
  from: FormatId | null;
  status: ItemStatus;
  error: string | null;
  suggestion: string | null;
  result: ConversionResult | null;
  /** Object URL of the source, for the before/after comparison. */
  sourceUrl: string;
  /** Overrides the global settings for this one file. */
  overrides: Partial<Settings>;
}

export interface Settings {
  target: FormatId;
  quality: number;
  lossless: boolean;
  /** Run oxipng over PNG output. */
  optimize: boolean;
  /** Size budget in kilobytes, or null for "just use the quality". */
  targetKb: number | null;
  ops: ImageOps;
  namePattern: string;
}

function defaultSettings(): Settings {
  return {
    target: "webp",
    quality: FORMATS.webp.quality!.default,
    lossless: false,
    optimize: false,
    targetKb: null,
    ops: { ...DEFAULT_OPS },
    namePattern: DEFAULT_NAME_PATTERN,
  };
}

interface ConverterState {
  items: QueueItem[];
  settings: Settings;
  isConverting: boolean;

  addFiles: (files: File[]) => Promise<void>;
  removeItem: (id: string) => void;
  clearAll: () => void;

  setTarget: (target: FormatId) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  patchOps: (patch: Partial<ImageOps>) => void;
  resetOps: () => void;

  convertAll: () => Promise<void>;
  outputNameFor: (id: string) => string;
}

/** Settings for one item, with its overrides folded in. */
export function effectiveSettings(item: QueueItem, settings: Settings): Settings {
  return { ...settings, ...item.overrides };
}

function encodeOptionsFrom(settings: Settings): EncodeOptions {
  return {
    quality: settings.quality,
    lossless: settings.lossless,
    optimize: settings.optimize,
    targetBytes: settings.targetKb === null ? null : Math.round(settings.targetKb * 1024),
  };
}

/**
 * Runs `task` over `items` with at most `limit` in flight.
 *
 * The worker pool already caps parallelism, but without a limit here every file
 * in the batch would be read into memory at once — 40 raw photos is enough to
 * crash a tab before a single conversion finishes.
 */
async function mapWithLimit<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await task(item);
    }
  });
  await Promise.all(runners);
}

function releaseItem(item: QueueItem): void {
  URL.revokeObjectURL(item.sourceUrl);
  if (item.result) URL.revokeObjectURL(item.result.url);
}

export const useConverterStore = create<ConverterState>((set, get) => ({
  items: [],
  settings: defaultSettings(),
  isConverting: false,

  addFiles: async (files) => {
    const added: QueueItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      from: null,
      status: "queued",
      error: null,
      suggestion: null,
      result: null,
      sourceUrl: URL.createObjectURL(file),
      overrides: {},
    }));

    set((state) => ({ items: [...state.items, ...added] }));

    // Sniffing reads only the first few KB, but it is still I/O — do it after
    // the rows appear so a large drop feels instant.
    await Promise.all(
      added.map(async (item) => {
        try {
          const from = await identify(item.file);
          set((state) => ({
            items: state.items.map((i) => (i.id === item.id ? { ...i, from } : i)),
          }));
        } catch (error) {
          const message =
            error instanceof ConversionError ? error.message : "This file could not be read.";
          const suggestion = error instanceof ConversionError ? error.suggestion : null;
          set((state) => ({
            items: state.items.map((i) =>
              i.id === item.id ? { ...i, status: "error", error: message, suggestion } : i,
            ),
          }));
        }
      }),
    );
  },

  removeItem: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (item) releaseItem(item);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  clearAll: () => {
    get().items.forEach(releaseItem);
    // Workers hold a wasm heap each; drop them when the queue empties rather
    // than keeping tens of megabytes alive for a page that may just sit idle.
    terminatePool();
    set({ items: [] });
  },

  setTarget: (target) => {
    const spec = FORMATS[target];
    set((state) => ({
      settings: {
        ...state.settings,
        target,
        // Quality scales differ per codec — AVIF 60 looks like JPEG 85 — so
        // carrying the old number across formats would be misleading.
        quality: spec.quality?.default ?? state.settings.quality,
        lossless: spec.lossless ? state.settings.lossless : false,
      },
      // Results were produced for the previous format; keep the files, drop the
      // stale outputs so nothing downloadable is mislabelled.
      items: state.items.map((item) => {
        if (item.result) URL.revokeObjectURL(item.result.url);
        return item.status === "error" && item.from === null
          ? item
          : { ...item, status: "queued", result: null, error: null, suggestion: null };
      }),
    }));
  },

  patchSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

  patchOps: (patch) =>
    set((state) => ({ settings: { ...state.settings, ops: { ...state.settings.ops, ...patch } } })),

  resetOps: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        ops: { ...DEFAULT_OPS, filters: { ...NEUTRAL_FILTERS } },
      },
    })),

  convertAll: async () => {
    const { items, settings } = get();
    const pending = items.filter((item) => item.from !== null);
    if (pending.length === 0) return;

    set({ isConverting: true });

    const update = (id: string, patch: Partial<QueueItem>) =>
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      }));

    await mapWithLimit(pending, 4, async (item) => {
      const active = effectiveSettings(item, settings);

      // Re-check the route per item: the block depends on this file's size, so
      // a batch can legitimately be part convertible and part not.
      const route = routeConversion({
        from: item.from!,
        to: active.target,
        bytes: item.file.size,
      });
      if (route.engine === "blocked") {
        update(item.id, { status: "error", error: route.reason, suggestion: route.suggestion });
        return;
      }

      update(item.id, { status: "converting", error: null, suggestion: null });

      try {
        const outcome = await convertFile({
          file: item.file,
          target: active.target,
          ops: active.ops,
          encode: encodeOptionsFrom(active),
        });

        const previous = get().items.find((i) => i.id === item.id)?.result;
        if (previous) URL.revokeObjectURL(previous.url);

        update(item.id, {
          status: "done",
          result: {
            blob: outcome.blob,
            url: URL.createObjectURL(outcome.blob),
            width: outcome.width,
            height: outcome.height,
            engine: outcome.engine,
            qualityUsed: outcome.qualityUsed,
            targetMissed: outcome.targetMissed,
          },
        });
      } catch (error) {
        update(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Conversion failed.",
          suggestion: error instanceof ConversionError ? error.suggestion : null,
        });
      }
    });

    set({ isConverting: false });
  },

  outputNameFor: (id) => {
    const { items, settings } = get();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return "image";

    const item = items[index];
    const active = effectiveSettings(item, settings);
    return applyNamePattern(active.namePattern, {
      original: item.file.name,
      target: active.target,
      index: index + 1,
      total: items.length,
      width: item.result?.width ?? 0,
      height: item.result?.height ?? 0,
    });
  },
}));
