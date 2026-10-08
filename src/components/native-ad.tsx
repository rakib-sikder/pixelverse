"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLazyAd } from "@/lib/use-lazy-ad";

type NativeAdProps = {
  /** Adsterra unit key; the loader looks for `container-<key>` to fill. */
  adKey: string;
  src: string;
  className?: string;
};

/**
 * Adsterra's native banner: a loader that finds its own container by id and
 * renders cards into it, so there is no size to declare — it sizes itself to
 * the column it sits in. The loader is appended only once the slot is ready
 * (page loaded, near the viewport), so a blocked ad domain never delays the app
 * and an off-screen native never fetches until scrolled to.
 */
export function NativeAd({ adKey, src, className }: NativeAdProps) {
  const { ref, ready } = useLazyAd<HTMLElement>();
  const containerRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    const container = containerRef.current;
    if (!ready || !holder) return;

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
  }, [ready, src]);

  return (
    <aside ref={ref} aria-label="Advertisement" className={cn("w-full", className)}>
      <span className="mb-2 block text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
        Advertisement
      </span>
      <div ref={containerRef} id={`container-${adKey}`} />
      <div ref={holderRef} hidden />
    </aside>
  );
}
