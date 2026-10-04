import Link from "next/link";
import { CONVERSIONS } from "@/lib/conversions";

/**
 * The footer carries the full list of conversion pages, which is the cheapest
 * way to make sure every one of them is reachable from every other — a page a
 * crawler can only find through the sitemap is a page it treats as an
 * afterthought.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Popular conversions
        </h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {CONVERSIONS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {c.fromLabel} to {c.toLabel}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Conversion runs locally using WebAssembly. Only TIFF output touches a server, because no
          browser can encode it.
        </p>
      </div>
    </footer>
  );
}
