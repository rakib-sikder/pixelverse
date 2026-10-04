import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITEWIDE_AD_SRCS } from "@/lib/ads";
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
  title: "PixelVerse — convert any image to any format",
  description:
    "Convert between JPEG, PNG, WebP, AVIF, JPEG XL, GIF, BMP, TIFF, ICO, SVG and HEIC. Batch conversion, resizing and compression that runs in your browser — your files are never uploaded.",
  applicationName: "PixelVerse",
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
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={200}>{children}</TooltipProvider>
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
