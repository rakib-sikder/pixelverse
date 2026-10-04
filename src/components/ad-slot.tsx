"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AdUnit } from "@/lib/ads";

type AdSlotProps = {
  /** Loaded from the `md` breakpoint up; the CSS below has to agree with it. */
  wide: AdUnit;
  /** Loaded below `md`. */
  narrow: AdUnit;
  className?: string;
};

/** Tailwind's `md`, repeated here because the box is reserved in CSS. */
const WIDE_FROM = "(min-width: 48rem)";

/**
 * One Adsterra display banner, sized to the viewport.
 *
 * Only the matching unit is ever put in the DOM. Rendering both and hiding one
 * would still load it, billing an impression nobody could see — the kind of
 * traffic that gets a publisher account closed. The viewport is read inside the
 * injecting effect rather than held in state, so a visit loads exactly one
 * banner: routing the match through a render would let hydration commit the
 * server's guess first and load the other size on the way to the right one.
 */
export function AdSlot({ wide, narrow, className }: AdSlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const unit = window.matchMedia(WIDE_FROM).matches ? wide : narrow;

    // The loader reads a global `atOptions` the moment it runs, so the config
    // has to be in the document first. An inline script executes the instant it
    // is appended, which gets that ordering for free.
    const options = document.createElement("script");
    options.text = `atOptions = ${JSON.stringify({
      key: unit.key,
      format: "iframe",
      height: unit.height,
      width: unit.width,
      params: {},
    })};`;

    const loader = document.createElement("script");
    loader.src = unit.src;
    // Dynamic scripts default to async; keep insertion order so the loader
    // never runs ahead of the config above it.
    loader.async = false;

    host.append(options, loader);

    // Dev remounts the effect and the loader is not idempotent, so clearing the
    // host means a remount replaces the banner instead of stacking a second one.
    return () => host.replaceChildren();
  }, [wide, narrow]);

  return (
    <aside aria-label="Advertisement" className={cn("flex flex-col items-center gap-2", className)}>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      {/* Reserved in CSS at both sizes so the space is held from first paint —
          the banner only arrives after hydration, and a box that appeared then
          would shift the page under someone mid-batch. */}
      <div
        ref={hostRef}
        className="h-[50px] w-[320px] max-w-full overflow-hidden md:h-[90px] md:w-[728px]"
      />
    </aside>
  );
}
