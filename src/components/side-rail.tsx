"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { documentFor } from "@/components/ad-slot";
import { useLazyAd } from "@/lib/use-lazy-ad";
import type { AdUnit } from "@/lib/ads";

/**
 * A skyscraper banner fixed in a side gutter.
 *
 * Shown only from the 2xl breakpoint up, where the centred content leaves ~192px
 * each side — room for a 160px rail without overlap. Below that the gutters are
 * too narrow, so the rails are hidden. Each rail is its own iframe, so one unit
 * fills both without the shared-atOptions collision, and the srcdoc is set only
 * once the page has loaded so a slow ad domain cannot delay it.
 */
export function SideRail({ unit, side }: { unit: AdUnit; side: "left" | "right" }) {
  const { ref, ready } = useLazyAd<HTMLIFrameElement>();

  useEffect(() => {
    const frame = ref.current;
    if (ready && frame) frame.srcdoc = documentFor(unit);
  }, [ready, unit, ref]);

  return (
    <aside
      aria-label="Advertisement"
      className={cn(
        "fixed top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 2xl:flex",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      <iframe
        ref={ref}
        title="Advertisement"
        scrolling="no"
        className="h-[600px] w-[160px] border-0"
      />
    </aside>
  );
}
