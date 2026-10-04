"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type NativeAdProps = {
  /** Adsterra unit key; the loader looks for `container-<key>` to fill. */
  adKey: string;
  src: string;
  className?: string;
};

/**
 * Adsterra's native banner: a loader that finds its own container by id and
 * renders cards into it, so unlike the display banner there is no size to
 * declare and nothing to reserve — it sizes itself to the column it sits in.
 */
export function NativeAd({ adKey, src, className }: NativeAdProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    const container = containerRef.current;
    if (!holder) return;

    const loader = document.createElement("script");
    loader.src = src;
    loader.async = true;
    // Cloudflare's Rocket Loader rewrites third-party scripts and breaks the
    // fill; Adsterra's own snippet opts out the same way.
    loader.setAttribute("data-cfasync", "false");
    holder.append(loader);

    // Dev remounts the effect and the loader is not idempotent, so both the
    // script and whatever it rendered have to go or the cards stack up.
    return () => {
      holder.replaceChildren();
      container?.replaceChildren();
    };
  }, [src]);

  return (
    <aside aria-label="Advertisement" className={cn("w-full", className)}>
      <span className="mb-2 block text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      <div ref={containerRef} id={`container-${adKey}`} />
      <div ref={holderRef} hidden />
    </aside>
  );
}
