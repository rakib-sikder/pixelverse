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

/** Native banner. Its loader fills a div whose id is the unit key, prefixed. */
const nativeSrc = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE;
const nativeKey = nativeSrc && keyOf(nativeSrc);
export const NATIVE_AD = nativeSrc && nativeKey ? { src: nativeSrc, key: nativeKey } : null;

/**
 * Units that attach to the whole page rather than to a slot in it — the social
 * bar floats over the layout, so it has no place in the document to sit.
 *
 * The popunder was here and was taken out: it answered any click anywhere on
 * the page by opening another site, which on a tool people come to with a job
 * in hand reads as the site breaking rather than as an ad.
 */
export const SITEWIDE_AD_SRCS = [process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR].filter(
  (src): src is string => Boolean(src),
);
