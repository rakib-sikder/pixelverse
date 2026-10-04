/**
 * Adsterra display banners.
 *
 * Two units because an Adsterra display banner is a fixed size — one key per
 * size, no responsive unit — so a 728x90 for desktop and a 320x50 for phones.
 *
 * The loader URL is per-publisher and ends in the unit key, which `atOptions`
 * then has to repeat; deriving the key from the URL keeps one env var per unit
 * instead of two that could drift apart.
 *
 * Both live in the environment rather than here because this repo is public: a
 * key is visible in the page source either way, but next to the source it
 * invites being pasted onto a spam site, and Adsterra bans the publisher
 * account rather than the thief. Set NEXT_PUBLIC_ADSTERRA_BANNER_WIDE and
 * NEXT_PUBLIC_ADSTERRA_BANNER_NARROW in the Vercel project; unset — the default
 * locally — the page renders ad-free.
 */
export type AdUnit = {
  key: string;
  src: string;
  width: number;
  height: number;
};

function unit(src: string | undefined, width: number, height: number): AdUnit | null {
  const key = src?.split("/").pop();
  return src && key ? { key, src, width, height } : null;
}

const wide = unit(process.env.NEXT_PUBLIC_ADSTERRA_BANNER_WIDE, 728, 90);
const narrow = unit(process.env.NEXT_PUBLIC_ADSTERRA_BANNER_NARROW, 320, 50);

/**
 * Null unless both sizes are configured: the slot reserves its box in CSS at
 * both breakpoints, so a missing half would leave one viewport with a hole.
 */
export const BANNER_ADS = wide && narrow ? { wide, narrow } : null;
