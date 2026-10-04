import type { MetadataRoute } from "next";
import { CONVERSIONS } from "@/lib/conversions";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...CONVERSIONS.map((c) => ({
      url: `${SITE_URL}/${c.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      // Below the home page, but level with each other: there is no reason to
      // tell a crawler that HEIC matters more than WebP when the traffic has
      // not said so yet.
      priority: 0.8,
    })),
  ];
}
