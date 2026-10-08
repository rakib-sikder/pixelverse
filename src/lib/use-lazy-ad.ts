"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Gates an ad slot so it loads only once the page itself has finished loading
 * and the slot is near the viewport.
 *
 * Ad loaders live on a third-party domain that some networks block or stall. If
 * the slot fetches on first paint, a stalled ad request keeps the browser's
 * loading indicator spinning and the page feels stuck even though it is usable.
 * Waiting for `load`, then for the slot to approach the viewport, means the app
 * is always done loading before any ad request goes out, and off-screen ads
 * never fire at all until scrolled to.
 */
export function useLazyAd<T extends Element>() {
  const ref = useRef<T>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let observer: IntersectionObserver | null = null;
    const arm = () => {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setReady(true);
            observer?.disconnect();
          }
        },
        // Start a little before the slot scrolls in, so it is usually filled by
        // the time it is actually looked at.
        { rootMargin: "300px" },
      );
      observer.observe(el);
    };

    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("load", arm);
    };
  }, []);

  return { ref, ready };
}
