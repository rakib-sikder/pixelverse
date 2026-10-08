"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLazyAd } from "@/lib/use-lazy-ad";
import type { AdUnit } from "@/lib/ads";

type AdSlotProps = {
  /** Loaded from the `md` breakpoint up; the iframe box below has to agree. */
  wide: AdUnit;
  /** Loaded below `md`. */
  narrow: AdUnit;
  className?: string;
};

/** Tailwind's `md`, repeated here because the box is reserved in CSS. */
const WIDE_FROM = "(min-width: 48rem)";

/**
 * The document that goes inside the iframe: the unit's `atOptions` config and
 * then Adsterra's loader. The loader runs during the iframe's own parse, so a
 * `document.write` in it lands in an open document rather than wiping the page.
 */
export function documentFor(unit: AdUnit): string {
  const options = JSON.stringify({
    key: unit.key,
    format: "iframe",
    height: unit.height,
    width: unit.width,
    params: {},
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body><script>atOptions = ${options};</script><script src="${unit.src}"></script></body></html>`;
}

/**
 * One Adsterra display banner, each in its own iframe.
 *
 * Each banner gets its own iframe because the loader reads a single global
 * `atOptions`; injecting two into the page itself would leave the second
 * overwriting the first and one of them blank. srcdoc keeps the page's origin,
 * so Adsterra still sees the approved domain. The srcdoc is set only once the
 * slot is ready (page loaded, near the viewport), so a blocked or slow ad
 * domain never holds up the app. Only the unit matching the viewport loads.
 */
export function AdSlot({ wide, narrow, className }: AdSlotProps) {
  const { ref, ready } = useLazyAd<HTMLIFrameElement>();

  useEffect(() => {
    const frame = ref.current;
    if (!ready || !frame) return;
    const unit = window.matchMedia(WIDE_FROM).matches ? wide : narrow;
    frame.srcdoc = documentFor(unit);
  }, [ready, wide, narrow, ref]);

  return (
    <aside aria-label="Advertisement" className={cn("flex flex-col items-center gap-2", className)}>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      {/* Box reserved at both sizes so the banner cannot shift the page under
          someone once the srcdoc resolves. */}
      <iframe
        ref={ref}
        title="Advertisement"
        scrolling="no"
        className="h-[50px] w-[320px] max-w-full border-0 md:h-[90px] md:w-[728px]"
      />
    </aside>
  );
}
