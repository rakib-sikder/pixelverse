/**
 * The canonical origin, used for canonical links, the sitemap and robots.txt.
 *
 * Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` to the production domain on every
 * deploy, including previews — which is what canonicals want, since a preview
 * should point search engines at production rather than at itself. Setting
 * `NEXT_PUBLIC_SITE_URL` overrides it, which is what a custom domain needs.
 */
const configured =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);

export const SITE_URL = (configured ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "PixelVerse";

export const REPO_URL = "https://github.com/rakib-sikder/pixelverse";
