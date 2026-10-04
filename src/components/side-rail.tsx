"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { documentFor } from "@/components/ad-slot";
import type { AdUnit } from "@/lib/ads";

/**
 * A skyscraper banner fixed in a side gutter.
 *
 * Only shown from the 2xl breakpoint up: at 1536px the centred content is 1152px
 * wide, leaving ~192px each side, enough for a 160px rail with a margin and no
 * overlap. Below that the gutters are too narrow, so the rails are hidden rather
 * than allowed to sit on top of the page. Each rail is its own iframe, so the
 * same unit can fill both without the shared-atOptions collision.
 */
export function SideRail({ unit, side }: { unit: AdUnit; side: "left" | "right" }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame) frame.srcdoc = documentFor(unit);
  }, [unit]);

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
        ref={frameRef}
        title="Advertisement"
        scrolling="no"
        className="h-[600px] w-[160px] border-0"
      />
    </aside>
  );
}
