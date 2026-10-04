"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AdSlotProps = {
  /** Adsterra ad-unit key. */
  adKey: string;
  /** Must match the size the unit was created with, or the banner renders blank. */
  width: number;
  height: number;
  className?: string;
};

/**
 * One Adsterra display banner.
 *
 * invoke.js reads a global `atOptions` the moment it runs, so the config has to
 * be in the document before the loader starts. An inline script executes the
 * instant it is appended, which gets that ordering for free.
 *
 * That global is also why this stays a single slot per page: two of these would
 * both read whichever config was written last. A second placement needs an
 * <iframe srcDoc> per slot so each loader gets its own window.
 */
export function AdSlot({ adKey, width, height, className }: AdSlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const options = document.createElement("script");
    options.text = `atOptions = ${JSON.stringify({
      key: adKey,
      format: "iframe",
      height,
      width,
      params: {},
    })};`;

    const loader = document.createElement("script");
    loader.src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;
    // Dynamic scripts default to async; keep insertion order so the loader
    // never runs ahead of the config above it.
    loader.async = false;

    host.append(options, loader);

    // Dev remounts the effect, and the loader is not idempotent — clearing the
    // host means a remount replaces the banner instead of stacking a second one.
    return () => host.replaceChildren();
  }, [adKey, width, height]);

  return (
    <aside aria-label="Advertisement" className={cn("flex flex-col items-center gap-2", className)}>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      {/* Reserve the exact box up front so the banner cannot shift the page under
          someone mid-conversion. */}
      <div
        ref={hostRef}
        style={{ width, height }}
        className="max-w-full overflow-hidden"
      />
    </aside>
  );
}
