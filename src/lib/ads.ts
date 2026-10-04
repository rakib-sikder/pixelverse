/**
 * Adsterra display-banner unit, or null when the site should run ad-free.
 *
 * The key lives in the environment rather than here because this repo is
 * public: the key is already visible in the page source of any ad-supported
 * site, but publishing it next to the source invites someone to paste it onto
 * a spam site, and Adsterra bans the publisher account, not the thief.
 *
 * Set NEXT_PUBLIC_ADSTERRA_BANNER_KEY in the Vercel project (and in .env.local
 * for local work). Unset — the default locally — renders no ad at all.
 *
 * A key is bound to one fixed size in the Adsterra dashboard, and `width` and
 * `height` must match the size the unit was created with or the slot renders
 * blank. Adsterra has no responsive display banner; a second size needs a
 * second key.
 */
const key = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY;

export const BANNER_AD = key ? { key, width: 728, height: 90 } : null;
