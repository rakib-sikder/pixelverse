/**
 * Adsterra units.
 *
 * Every loader URL is per-publisher and ends in the unit key, which the markup
 * then has to repeat; deriving the key from the URL keeps one env var per unit
 * instead of two that could drift apart.
 *
 * They all live in the environment rather than here because this repo is
 * public: a key is visible in the page source either way, but next to the
 * source it invites being pasted onto a spam site, and Adsterra bans the
 * publisher account rather than the thief. Unset — the default locally — the
 * page renders ad-free.
 */
export type AdUnit = {
  key: string;
  src: string;
  width: number;
  height: number;
};

function keyOf(src: string): string | undefined {
  return src.split("/").pop() || undefined;
}

function unit(src: string | undefined, width: number, height: number): AdUnit | null {
  const key = src && keyOf(src);
  return src && key ? { key, src, width, height } : null;
}

const wide = unit(process.env.NEXT_PUBLIC_ADSTERRA_BANNER_WIDE, 728, 90);
const narrow = unit(process.env.NEXT_PUBLIC_ADSTERRA_BANNER_NARROW, 320, 50);

/**
 * Display banners. Null unless both sizes are configured: the slot reserves its
 * box in CSS at both breakpoints, so a missing half would leave one viewport
 * with a hole. Adsterra has no responsive unit — one key is one fixed size.
 */
export const BANNER_ADS = wide && narrow ? { wide, narrow } : null;

/**
 * Vertical skyscraper for the wide-screen side gutters. One key fills both rails
 * because each rail is its own iframe (see SideRail), so the shared global the
 * banners once fought over is not an issue here. 728x90 and 320x50 cannot stand
 * in — Adsterra serves the size the key was made with, so a wide unit in a
 * narrow rail renders broken. Needs its own 160x600 unit.
 */
export const SKYSCRAPER_AD = unit(process.env.NEXT_PUBLIC_ADSTERRA_SKYSCRAPER, 160, 600);

/** Native banner. Its loader fills a div whose id is the unit key, prefixed. */
const nativeSrc = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE;
const nativeKey = nativeSrc && keyOf(nativeSrc);
export const NATIVE_AD = nativeSrc && nativeKey ? { src: nativeSrc, key: nativeKey } : null;

/**
 * Units that attach to the whole page rather than to a slot in it — now just
 * the social bar, which floats over the layout.
 *
 * The popunder used to be here and is gone for good: it opened another site on
 * any click anywhere on the page, which on a tool reads as the page breaking
 * rather than as an ad.
 */
export const SITEWIDE_AD_SRCS = [process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR].filter(
  (src): src is string => Boolean(src),
);
