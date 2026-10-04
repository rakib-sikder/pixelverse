import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerBreak, NativeBreak } from "@/components/ad-break";
import { Converter } from "@/components/converter";
import { CONVERSIONS, conversionBySlug } from "@/lib/conversions";

export function generateStaticParams() {
  return CONVERSIONS.map((c) => ({ pair: c.slug }));
}

/**
 * This route sits at the root, so without it any unknown path — a typo, a stale
 * link, a crawler probing — would be rendered as a conversion page instead of
 * returning a 404.
 */
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[pair]">): Promise<Metadata> {
  const { pair } = await params;
  const conversion = conversionBySlug(pair);
  if (!conversion) return {};

  return {
    title: conversion.title,
    description: conversion.description,
    alternates: { canonical: `/${conversion.slug}` },
    openGraph: {
      title: conversion.title,
      description: conversion.description,
      url: `/${conversion.slug}`,
      type: "website",
    },
  };
}

export default async function ConversionPage({ params }: PageProps<"/[pair]">) {
  const { pair } = await params;
  const conversion = conversionBySlug(pair);
  if (!conversion) notFound();

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: conversion.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-10 space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {conversion.heading}
        </h1>
        <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">{conversion.intro}</p>
      </div>

      {/* The converter opens on this page's target, so the format someone came
          here for is already selected when they drop a file in. */}
      <Converter target={conversion.to} afterResults={<NativeBreak className="mt-2" />} />

      <BannerBreak className="mt-12" />

      <section className="mx-auto mt-16 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight">
          What changes, and what stays the same
        </h2>
        <ul className="mt-4 space-y-3">
          {conversion.notes.map((note) => (
            <li
              key={note}
              className="border-l-2 border-border pl-4 text-sm text-pretty text-muted-foreground"
            >
              {note}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-14 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
        <dl className="mt-4 space-y-6">
          {conversion.faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="text-sm font-medium">{faq.q}</dt>
              <dd className="mt-1.5 text-sm text-pretty text-muted-foreground">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Repeats the questions above in the form search engines read, which is
          what can put them in the result itself rather than behind a click. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </main>
  );
}
