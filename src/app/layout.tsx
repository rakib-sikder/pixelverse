import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      </body>
    </html>
  );
}
