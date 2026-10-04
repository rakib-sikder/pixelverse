"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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
function documentFor(unit: AdUnit): string {
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
 * The loader reads a single global `atOptions`, so injecting two banners into
 * the page itself would leave the second overwriting the first's config and one
 * of them blank. Giving each its own iframe gives each its own window and its
 * own global, which is what lets more than one banner sit on a page. The iframe
 * is `srcdoc`, so it keeps the page's origin — Adsterra still sees the approved
 * domain as the referrer.
 *
 * Only the unit matching the viewport is loaded; rendering both and hiding one
 * would still bill an impression nobody could see.
 */
export function AdSlot({ wide, narrow, className }: AdSlotProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const unit = window.matchMedia(WIDE_FROM).matches ? wide : narrow;
    frame.srcdoc = documentFor(unit);
  }, [wide, narrow]);

  return (
    <aside aria-label="Advertisement" className={cn("flex flex-col items-center gap-2", className)}>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      {/* Box reserved at both sizes so the banner cannot shift the page under
          someone once the srcdoc resolves after hydration. */}
      <iframe
        ref={frameRef}
        title="Advertisement"
        scrolling="no"
        className="h-[50px] w-[320px] max-w-full border-0 md:h-[90px] md:w-[728px]"
      />
    </aside>
  );
}
