import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BannerBreak, NativeBreak, SmallBannerBreak } from "@/components/ad-break";
import { AnchorAd, AnchorAdSpacer } from "@/components/anchor-ad";
import { Converter } from "@/components/converter";
import { CONVERSIONS } from "@/lib/conversions";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-6">
      <div className="mb-4 space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Convert any image to any format
        </h1>
        <p className="mx-auto hidden max-w-2xl text-sm text-pretty text-muted-foreground sm:block">
          JPEG, PNG, WebP, AVIF, JPEG&nbsp;XL, HEIC, GIF, BMP, TIFF, ICO and SVG. Batch convert,
          resize and compress — all of it running in your browser, with no upload and no size limit.
        </p>
      </div>

      {/* The one slot a visitor sees without scrolling, on a laptop and on a
          phone. It sits above the converter rather than below it because the
          hero and the dropzone are now short enough to leave room, and a slot
          under the fold on a phone is a slot nobody sees. */}
      <BannerBreak className="mb-6" />

      {/* Attention peaks between the "it worked" line and the download button,
          which is what the converter exposes this slot for. */}
      <Converter afterResults={<BannerBreak className="mt-4" />} />

      <BannerBreak className="mt-8" />

      <section className="mt-16">
        <h2 className="text-xl font-semibold tracking-tight">Common conversions</h2>
        <p className="mt-2 max-w-xl text-sm text-pretty text-muted-foreground">
          Each one opens the converter already set to that format, with notes on what the change
          costs and what it keeps.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONVERSIONS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/40"
              >
                <span className="text-sm font-medium">
                  {c.fromLabel} <span className="text-muted-foreground">to</span> {c.toLabel}
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Always on, not gated behind a conversion: the home page has a tall blank
          lower half, and the native banner is the unit that fills it without
          reading as a billboard. One native per page — the loader fills a
          container keyed by the unit id, so a second would leave both empty. */}
      {/* Narrower than the display banner so it reads as a break between the
          list and the native unit rather than a second billboard. */}
      <SmallBannerBreak className="mt-10" />

      <NativeBreak className="mt-16" />

      <AnchorAdSpacer />
      <AnchorAd />
    </main>
  );
}
