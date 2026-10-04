# PixelVerse

Convert, resize and compress images in the browser. Nothing is uploaded — the
files never leave the machine they were opened on.

<!-- TODO: add the Vercel URL here once the first deploy is live. -->
**Live demo** — _deploying_ · **[Source](https://github.com/rakib-sikder/pixelverse)**

---

## Why it exists

Every "free image converter" result on Google does the same thing: upload your
file to someone's server, convert it there, hand back a link, and keep a copy.
For a holiday photo that is merely rude. For a scanned passport, a signed
contract, or a medical image, it is a data leak with a download button.

The codecs those servers run compile to WebAssembly. So the conversion can
happen on the visitor's own machine instead, and the file never needs to be
uploaded at all.

PixelVerse does that. Drop in a batch, pick a target format, get a zip back.
No account, no upload, no server bill that scales with usage.

## Formats

| Format | Read | Write |
|---|:---:|:---:|
| JPEG | ✅ | ✅ |
| PNG | ✅ | ✅ (oxipng) |
| WebP | ✅ | ✅ |
| AVIF | ✅ | ✅ |
| JPEG XL | ✅ | ✅ |
| GIF | ✅ | ✅ |
| BMP | ✅ | ✅ |
| ICO | ✅ | ✅ (multi-size favicons) |
| TIFF | ✅ | ✅ (server) |
| HEIC | ✅ | — |
| SVG | ✅ (raster) | — |

Everything except TIFF encoding runs client-side. TIFF has no maintained
WebAssembly encoder, so it falls back to one narrow API route backed by `sharp`,
capped below Vercel's ~4.5 MB body limit. That is the only path where bytes
reach a server, and the UI says so before it happens.

## Features

- **Batch conversion** — drop a folder, download a zip
- **Target file size** — binary search over encoder quality to hit "under 200 KB"
- **Resize and crop** — with aspect-ratio-aware planning
- **Quality controls** per format, with sensible defaults
- **Parallel** — a worker pool sized to `navigator.hardwareConcurrency`
- **Dark mode**, keyboard accessible, no layout shift

## How it works

```
 UI (React 19)
    │
    ▼
 ConversionPool ──── spawns N module workers ────┐
    │                                            │
    │  Comlink RPC                               ▼
    │                                      worker.ts
    │                                            │
    │                          ┌─────────────────┼─────────────────┐
    │                          ▼                 ▼                 ▼
    │                     decode.ts           ops.ts           encode.ts
    │                    (wasm codecs)     (resize/crop)     (wasm codecs)
    │
    └── TIFF only ──▶ /api/convert (sharp, Node runtime)
```

Design decisions worth calling out:

**Codecs are dynamically imported.** `@jsquash/avif` alone is 8.1 MB. Loading
every codec up front would mean a ~22 MB download to convert one JPEG, so each
`decode`/`encode` is behind an `import()` and only the codecs a job actually
touches get fetched.

**Work happens in module workers, not the main thread.** WASM instantiation and
pixel loops block whatever thread they run on. Putting them in a pool keeps the
UI responsive while a 200-file batch runs, and lets conversions run in parallel
across cores.

**The format table is the single source of truth.** `lib/formats.ts` declares
what each format can decode and encode; the router, the server route's allowlist
and the UI's dropdowns all derive from it, so they cannot drift apart.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest — 145 tests
npm run build       # production build
```

## Ads and analytics

Visitor counts come from Vercel Analytics — `<Analytics />` sits in the root
layout, and daily, weekly and monthly numbers appear under the project's
Analytics tab once the site is deployed. Nothing to configure.

The banner below the converter is an Adsterra display unit, and it renders only
when `NEXT_PUBLIC_ADSTERRA_BANNER_KEY` is set:

```bash
# .env.local — gitignored. Set the same variable in the Vercel project.
NEXT_PUBLIC_ADSTERRA_BANNER_KEY=your-ad-unit-key
```

The key stays out of the repo because this one is public: a key pasted onto a
spam site gets the publisher account banned, not the thief. Unset — the default
locally — the page renders ad-free.

One key is bound to one size in the Adsterra dashboard, so `width` and `height`
in `lib/ads.ts` must match the unit the key was created with, and a mobile size
needs a second key. Ads serve only on a domain Adsterra has approved, so the
slot stays blank on localhost and on preview deploys.

## A note on the build

`npm run build` passes `--webpack` deliberately.

Turbopack (Next 16.3.0) does not finish a production build of this project — it
hangs after "Creating an optimized production build" with no further output.
Bisected to the module worker in `lib/engine/client/pool.ts`, whose dependency
graph pulls in ~22 MB of dynamically imported WASM. Under webpack the same tree
builds in about 10 seconds. `next dev` still uses Turbopack and is unaffected.

`npm run build:turbopack` is kept so this can be re-tested after a Next upgrade.
Full reasoning is in the comment block in `next.config.ts`.

## Not done yet

- **SVG output** — needs a raster-to-vector pass (`imagetracer`); currently
  SVG can be read but not written.
- **PDF** — neither direction is wired up yet.

Both are marked `TODO` in `lib/formats.ts` and hidden from the UI rather than
shown as options that fail.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Base UI · Zustand · Comlink ·
[jSquash](https://github.com/jamsinclair/jSquash) WASM codecs · libheif-js ·
utif2 · gifenc · sharp (TIFF only) · Vitest

## Licence

Not set yet — add a `LICENSE` file before making the repo public. MIT is the
usual choice for a portfolio project.
