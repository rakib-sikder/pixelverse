"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { documentFor } from "@/components/ad-slot";
import { useLazyAd } from "@/lib/use-lazy-ad";
import { RAIL_AD, type AdUnit } from "@/lib/ads";

/**
 * A skyscraper banner fixed in a side gutter.
 *
 * Shown from 2xl up, the first width where the centred column leaves the 176px
 * a 160px rail plus its offset needs. Narrower than that the viewport gutters
 * are too thin and the flanks beside the dropzone carry the rail instead. Every frame is its own iframe, so one unit
 * can fill all of them without the shared-atOptions collision, and each srcdoc
 * is set only once the page has loaded so a slow ad domain cannot delay it.
 */
function RailFrame({ unit }: { unit: AdUnit }) {
  const { ref, ready } = useLazyAd<HTMLIFrameElement>();

  useEffect(() => {
    const frame = ref.current;
    if (ready && frame) frame.srcdoc = documentFor(unit);
  }, [ready, unit, ref]);

  return (
    <iframe
      ref={ref}
      title="Advertisement"
      scrolling="no"
      style={{ height: unit.height, width: unit.width }}
      className="border-0"
    />
  );
}

export function FlankRail() {
  if (!RAIL_AD) return null;
  return (
    <aside
      aria-label="Advertisement"
      className="hidden shrink-0 flex-col items-center gap-2 lg:flex"
    >
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      <RailFrame unit={RAIL_AD} />
    </aside>
  );
}

export function SideRail({ units, side }: { units: AdUnit[]; side: "left" | "right" }) {
  if (units.length === 0) return null;

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
      {units.map((unit, i) => (
        <RailFrame key={i} unit={unit} />
      ))}
    </aside>
  );
}
