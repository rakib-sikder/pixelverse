import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BannerBreak, NativeBreak } from "@/components/ad-break";
import { Converter } from "@/components/converter";
import { CONVERSIONS } from "@/lib/conversions";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-10 space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Convert any image to any format
        </h1>
        <p className="mx-auto max-w-xl text-pretty text-muted-foreground">
          JPEG, PNG, WebP, AVIF, JPEG&nbsp;XL, HEIC, GIF, BMP, TIFF, ICO and SVG. Batch convert,
          resize and compress — all of it running in your browser, with no upload and no size
          limit.
        </p>
      </div>

      <Converter />

      <BannerBreak className="mt-12" />

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

      <BannerBreak className="mt-16" />

      {/* Always on, not gated behind a conversion: the home page has a tall blank
          lower half, and the native banner is the unit that fills it without
          reading as a billboard. One native per page — the loader fills a
          container keyed by the unit id, so a second would leave both empty. */}
      <NativeBreak className="mt-16" />
    </main>
  );
}
