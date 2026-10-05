import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "@/components/site-footer";
import { SideRail } from "@/components/side-rail";
import { SiteHeader } from "@/components/site-header";
import { SITEWIDE_AD_SRCS, SKYSCRAPER_AD } from "@/lib/ads";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  // globals.css reads --font-sans, so bind it here rather than a Geist-specific
  // name; swapping the typeface then touches one line.
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Without this, every canonical and Open Graph URL is relative and search
  // engines are left to infer the origin — which on a preview deploy means the
  // preview.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PixelVerse — convert any image to any format",
    // A conversion page names its own format pair, so the suffix is all the
    // brand it needs.
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Convert between JPEG, PNG, WebP, AVIF, JPEG XL, GIF, BMP, TIFF, ICO, SVG and HEIC. Batch conversion, resizing and compression that runs in your browser — your files are never uploaded.",
  applicationName: SITE_NAME,
  keywords: [
    "image converter",
    "webp converter",
    "avif converter",
    "heic to jpeg",
    "png to jpg",
    "batch image converter",
  ],
  openGraph: {
    title: "PixelVerse — convert any image to any format",
    description:
      "Batch image conversion, resizing and compression that runs entirely in your browser.",
    type: "website",
    siteName: SITE_NAME,
  },
  // Search Console will not report which queries reach the site until it can
  // confirm the site is yours. Paste the code from its HTML-tag method into
  // GOOGLE_SITE_VERIFICATION and the meta tag it wants appears here.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Skyscrapers in the wide-screen side gutters; hidden where there is no
            room. One unit, two iframes. */}
        {SKYSCRAPER_AD && (
          <>
            <SideRail unit={SKYSCRAPER_AD} side="left" />
            <SideRail unit={SKYSCRAPER_AD} side="right" />
          </>
        )}
        <TooltipProvider delay={200}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </TooltipProvider>
        <Toaster position="bottom-right" />
        <Analytics />

        {/* The social bar floats over the layout and the popunder opens its own
            window, so neither has a slot in the page to sit in. They load after
            hydration so the converter is usable before any of this runs, and
            opt out of Cloudflare Rocket Loader the way Adsterra's own snippets
            do — rewriting them breaks the fill. */}
        {SITEWIDE_AD_SRCS.map((src) => (
          <Script key={src} src={src} strategy="afterInteractive" data-cfasync="false" />
        ))}

      </body>
    </html>
  );
}
