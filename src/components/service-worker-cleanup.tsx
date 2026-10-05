"use client";

import { useEffect } from "react";

/**
 * Unregisters any service worker left in a visitor's browser.
 *
 * Monetag's push ran here for a while and registered a worker. Deleting the
 * worker file from the server does not unregister one already installed in a
 * browser — it keeps controlling the page across loads and can intercept
 * navigation, which outlives the rest of the Monetag removal. Nothing uses a
 * service worker now, so tear down whatever is there. It also clears the caches
 * such a worker may have left, so a stale response cannot be served back.
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations?.()
        .then((regs) => regs.forEach((r) => void r.unregister()))
        .catch(() => {});
    }
    if ("caches" in window) {
      caches.keys?.().then((keys) => keys.forEach((k) => void caches.delete(k))).catch(() => {});
    }
  }, []);

  return null;
}
