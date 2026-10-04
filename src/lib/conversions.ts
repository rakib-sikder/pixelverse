import type { FormatId } from "@/lib/formats";

/**
 * The conversions that get their own page.
 *
 * Nobody searches for "image converter" — they search for the pair in front of
 * them, and one page cannot rank for a dozen of those at once. Each entry below
 * is one real query with its own copy: twelve near-identical pages would read
 * as thin duplicates and rank worse than the single page they were split from.
 *
 * Every `from` has to be decodable and every `to` encodable, or the page offers
 * a conversion the engine will refuse.
 */
export type Conversion = {
  slug: string;
  from: FormatId;
  to: FormatId;
  fromLabel: string;
  toLabel: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  notes: string[];
  faqs: { q: string; a: string }[];
};

export const CONVERSIONS: Conversion[] = [
  {
    slug: "heic-to-jpg",
    from: "heic",
    to: "jpeg",
    fromLabel: "HEIC",
    toLabel: "JPG",
    title: "HEIC to JPG converter — free, in your browser",
    description:
      "Convert iPhone HEIC photos to JPG without uploading them. Batch conversion that runs entirely in your browser, with no size limit and no account.",
    heading: "Convert HEIC to JPG",
    intro:
      "Every iPhone since iOS 11 saves photos as HEIC, and a good deal of the software people send those photos to still cannot open one. JPG is the format that opens everywhere — older Windows machines, print shops, forms that reject anything else.",
    notes: [
      "HEIC fits more detail into fewer bytes than JPG does, so expect the converted file to be larger than the original. That is the trade for being readable everywhere.",
      "Live Photos convert as the still frame. The motion is a separate video track that a JPG has nowhere to put.",
      "Photos stay on your device — the conversion runs in the browser, so nothing is uploaded anywhere.",
    ],
    faqs: [
      {
        q: "Does converting HEIC to JPG lose quality?",
        a: "Both are lossy, so re-encoding costs a little detail. At the default quality the difference is hard to see at normal viewing size; raise the quality slider if the photo is going to be cropped or printed.",
      },
      {
        q: "Can I convert a whole album at once?",
        a: "Yes. Drop in as many HEIC files as you like, convert them in one pass, and download the results as a zip.",
      },
      {
        q: "Why will Windows not open my HEIC files?",
        a: "Windows needs a paid codec from the Microsoft Store to read HEIC. Converting to JPG avoids that entirely.",
      },
    ],
  },
  {
    slug: "heic-to-png",
    from: "heic",
    to: "png",
    fromLabel: "HEIC",
    toLabel: "PNG",
    title: "HEIC to PNG converter — free, in your browser",
    description:
      "Convert HEIC photos to lossless PNG in your browser. No upload, no account, no size limit — useful when the image is going on to be edited.",
    heading: "Convert HEIC to PNG",
    intro:
      "PNG is the right target when the photo is not finished with. It is lossless, so nothing is thrown away in the conversion and nothing accumulates if the file is edited and saved again — unlike JPG, which loses a little more each round.",
    notes: [
      "PNG files made from photographs are large, often several times the HEIC. PNG compresses flat colour well and photographic noise badly.",
      "Choose JPG instead if the photo is only going to be viewed or shared; the size difference is substantial and the quality difference is not.",
      "The conversion runs in your browser, so nothing is uploaded.",
    ],
    faqs: [
      {
        q: "PNG or JPG for iPhone photos?",
        a: "PNG if the image is going into an editor and will be saved repeatedly, JPG if it is going to be sent, posted or printed as it is.",
      },
      {
        q: "Why is the PNG so much bigger than the HEIC?",
        a: "HEIC is lossy and built for photographs; PNG is lossless and built for graphics. Keeping every pixel exactly costs the space.",
      },
    ],
  },
  {
    slug: "webp-to-png",
    from: "webp",
    to: "png",
    fromLabel: "WebP",
    toLabel: "PNG",
    title: "WebP to PNG converter — free, in your browser",
    description:
      "Convert WebP images to PNG without uploading them. Transparency is preserved and it runs entirely in your browser.",
    heading: "Convert WebP to PNG",
    intro:
      "Images saved from the web arrive as WebP more often than not, and plenty of desktop software still refuses them — older Photoshop versions, some print workflows, a good deal of Office. PNG is the universally safe landing spot that keeps transparency intact.",
    notes: [
      "Transparent areas survive the conversion. Both formats carry an alpha channel.",
      "If the WebP was lossy, converting to PNG cannot restore what was already discarded — it preserves what is there rather than improving it.",
      "Animated WebP converts as a single frame. PNG has no animation.",
    ],
    faqs: [
      {
        q: "Will the transparent background stay transparent?",
        a: "Yes. PNG supports the same alpha channel WebP does, so transparency carries over unchanged.",
      },
      {
        q: "Is the conversion lossless?",
        a: "The PNG side is. Nothing further is lost in the conversion, though a lossy WebP source stays as it already was.",
      },
    ],
  },
  {
    slug: "webp-to-jpg",
    from: "webp",
    to: "jpeg",
    fromLabel: "WebP",
    toLabel: "JPG",
    title: "WebP to JPG converter — free, in your browser",
    description:
      "Convert WebP images to JPG in your browser. Batch conversion, adjustable quality, no upload and no account.",
    heading: "Convert WebP to JPG",
    intro:
      "JPG is the format nothing refuses. When a WebP has to go into a form, an old application or a device built before WebP existed, this is the conversion that makes it work.",
    notes: [
      "JPG has no transparency. Transparent areas are flattened onto a solid background.",
      "Use PNG instead if the image has a transparent background you need to keep.",
      "Quality is adjustable — raise it for images with text or sharp edges, which show JPG artifacts most.",
    ],
    faqs: [
      {
        q: "What happens to transparency?",
        a: "JPG cannot store it, so transparent pixels are filled in. Convert to PNG instead if that matters.",
      },
      {
        q: "Can I convert many files at once?",
        a: "Yes. Drop in as many as you like and download the batch as a zip.",
      },
    ],
  },
  {
    slug: "png-to-jpg",
    from: "png",
    to: "jpeg",
    fromLabel: "PNG",
    toLabel: "JPG",
    title: "PNG to JPG converter — free, in your browser",
    description:
      "Convert PNG images to JPG and cut the file size sharply. Adjustable quality, batch conversion, nothing uploaded.",
    heading: "Convert PNG to JPG",
    intro:
      "Screenshots are PNG, and PNG stores photographic detail very inefficiently — which is why a screenshot of a photo can run to several megabytes. JPG usually cuts most of that at a quality nobody notices on screen.",
    notes: [
      "Transparency is lost. JPG has no alpha channel, so transparent areas are flattened.",
      "Screenshots of text and interface stay sharper at higher quality settings; JPG artifacts cluster around hard edges.",
      "There is a target size option if the file has to come in under a specific limit for an upload form.",
    ],
    faqs: [
      {
        q: "How much smaller will the JPG be?",
        a: "For photographic content, usually a large fraction of the original. For flat graphics and screenshots of text the saving is smaller, and PNG may genuinely be the better format.",
      },
      {
        q: "Can I hit an exact file size?",
        a: "Yes. Set a target size and the quality is searched for you until the output fits under it.",
      },
    ],
  },
  {
    slug: "jpg-to-png",
    from: "jpeg",
    to: "png",
    fromLabel: "JPG",
    toLabel: "PNG",
    title: "JPG to PNG converter — free, in your browser",
    description:
      "Convert JPG images to lossless PNG in your browser. No upload, no account, no size limit.",
    heading: "Convert JPG to PNG",
    intro:
      "Worth doing when the image is about to be edited, or when something downstream only accepts PNG. PNG is lossless, so repeated editing and saving stops costing quality the way it does with JPG.",
    notes: [
      "This does not recover detail. Whatever the JPG already discarded is gone; PNG only stops the loss from continuing.",
      "Expect a considerably larger file. PNG keeps every pixel exactly.",
      "It does not add transparency either — the image arrives with the solid background it already had.",
    ],
    faqs: [
      {
        q: "Does converting to PNG improve the quality?",
        a: "No. It preserves what is there and prevents further loss on later saves, but it cannot restore what JPG compression already removed.",
      },
      {
        q: "Will it have a transparent background?",
        a: "No. A JPG has no transparency to carry over; removing a background is a separate editing job.",
      },
    ],
  },
  {
    slug: "png-to-webp",
    from: "png",
    to: "webp",
    fromLabel: "PNG",
    toLabel: "WebP",
    title: "PNG to WebP converter — free, in your browser",
    description:
      "Convert PNG to WebP and cut page weight while keeping transparency. Lossless mode available, nothing uploaded.",
    heading: "Convert PNG to WebP",
    intro:
      "The usual reason is page speed. WebP carries the same transparency PNG does in a fraction of the bytes, and every browser still receiving updates reads it.",
    notes: [
      "Transparency is preserved — WebP has a full alpha channel.",
      "There is a lossless mode for logos and diagrams where exactness matters; it still beats PNG on size.",
      "Lossy WebP is the bigger saving and is usually right for photographs.",
    ],
    faqs: [
      {
        q: "Do all browsers support WebP?",
        a: "Every browser still receiving updates does, including Safari since 2020.",
      },
      {
        q: "Lossless or lossy?",
        a: "Lossless for logos, icons and anything with text or flat colour. Lossy for photographs, where the size difference is much larger and the quality difference is not visible.",
      },
    ],
  },
  {
    slug: "jpg-to-webp",
    from: "jpeg",
    to: "webp",
    fromLabel: "JPG",
    toLabel: "WebP",
    title: "JPG to WebP converter — free, in your browser",
    description:
      "Convert JPG photos to WebP for smaller files at the same visual quality. Batch conversion in your browser, nothing uploaded.",
    heading: "Convert JPG to WebP",
    intro:
      "WebP generally reaches the same visual quality as JPG in meaningfully fewer bytes, which is why it has become the default for images on the web. For a page carrying dozens of photographs, that is the difference between fast and slow.",
    notes: [
      "Quality is adjustable, and the sensible approach is to lower it until you can see the difference, then go back one step.",
      "Keep the JPG originals. Re-encoding from an already-lossy source always costs a little.",
      "Resizing at the same time usually saves far more than any quality setting — a 4000px photo displayed at 800px is mostly wasted bytes.",
    ],
    faqs: [
      {
        q: "How much smaller are WebP files?",
        a: "For photographs, typically a quarter to a third smaller than JPG at a comparable quality, though it varies a great deal with the image.",
      },
      {
        q: "Should I resize as well?",
        a: "Almost always. Serving an image far larger than it is displayed wastes more bandwidth than the format choice ever recovers.",
      },
    ],
  },
  {
    slug: "avif-to-jpg",
    from: "avif",
    to: "jpeg",
    fromLabel: "AVIF",
    toLabel: "JPG",
    title: "AVIF to JPG converter — free, in your browser",
    description:
      "Convert AVIF images to JPG so older software can open them. Runs in your browser with no upload and no account.",
    heading: "Convert AVIF to JPG",
    intro:
      "AVIF is the smallest of the modern formats and the least widely readable outside a browser. Converting to JPG is what gets an AVIF into an editor, a document or a device that has never heard of it.",
    notes: [
      "The JPG will be larger than the AVIF, often considerably. AVIF compresses far harder.",
      "Transparency, if the AVIF has it, is flattened — JPG has no alpha channel.",
      "Convert to PNG instead when transparency has to survive.",
    ],
    faqs: [
      {
        q: "Why will my software not open AVIF?",
        a: "It is recent, and support outside browsers is still patchy. Most desktop applications need a plugin or a newer version.",
      },
      {
        q: "Will the image look worse?",
        a: "Slightly, since this is one lossy format being re-encoded into another. Raising the quality setting keeps the difference below what is visible.",
      },
    ],
  },
  {
    slug: "png-to-ico",
    from: "png",
    to: "ico",
    fromLabel: "PNG",
    toLabel: "ICO",
    title: "PNG to ICO converter — make a favicon in your browser",
    description:
      "Turn a PNG into an ICO favicon without uploading it. Runs entirely in your browser, free and with no account.",
    heading: "Convert PNG to ICO",
    intro:
      "ICO is what a browser looks for at /favicon.ico, and what Windows uses for application icons. It is the one format here that exists for a single job.",
    notes: [
      "Start from a square PNG. A rectangular source is fitted into a square and the result rarely looks deliberate.",
      "Favicons are rendered small — 16 and 32 pixels on most tabs — so fine detail and small text disappear. Simple shapes read best.",
      "Resize the PNG first if it is very large; detail that cannot be seen at 32 pixels only adds bytes.",
    ],
    faqs: [
      {
        q: "What size should the PNG be?",
        a: "Square, and at least 256 pixels so there is detail to work down from. Anything much larger adds nothing a favicon can show.",
      },
      {
        q: "Where does the file go?",
        a: "At the root of the site as favicon.ico. Browsers look there without being told.",
      },
    ],
  },
  {
    slug: "svg-to-png",
    from: "svg",
    to: "png",
    fromLabel: "SVG",
    toLabel: "PNG",
    title: "SVG to PNG converter — free, in your browser",
    description:
      "Rasterise SVG vector graphics to PNG at the size you choose. No upload, no account, runs in your browser.",
    heading: "Convert SVG to PNG",
    intro:
      "An SVG is instructions for drawing rather than pixels, which is why it stays sharp at any size — and why so much software will not take one. PNG is what you hand to a place that wants an image.",
    notes: [
      "Choose the size before converting. SVG scales to anything; the PNG it becomes does not, and enlarging it afterwards only blurs it.",
      "Transparent backgrounds carry over. PNG has the alpha channel for them.",
      "Fonts named by the SVG have to be available to the browser, or the text is drawn in a substitute.",
    ],
    faqs: [
      {
        q: "What size should I export?",
        a: "At least the size it will be displayed, and double that for high-density screens. There is no way back up once it is a PNG.",
      },
      {
        q: "Why does the text look different?",
        a: "The SVG names a font it does not contain. If the browser doing the conversion lacks that font, it substitutes another. Converting text to paths in the source avoids it.",
      },
    ],
  },
  {
    slug: "tiff-to-jpg",
    from: "tiff",
    to: "jpeg",
    fromLabel: "TIFF",
    toLabel: "JPG",
    title: "TIFF to JPG converter — free, in your browser",
    description:
      "Convert large TIFF scans and camera files to JPG. Batch conversion in your browser, nothing uploaded.",
    heading: "Convert TIFF to JPG",
    intro:
      "Scanners, fax archives and some cameras produce TIFF, and the files are enormous — frequently tens of megabytes for a single page. JPG is what makes them small enough to email, upload or put in a document.",
    notes: [
      "The size reduction here is the largest on this list. TIFF is often stored with no compression at all.",
      "Multi-page TIFFs convert as the first page. A JPG holds one image.",
      "Keep the TIFF if it is an archival scan — it is the copy with everything still in it.",
    ],
    faqs: [
      {
        q: "Why are TIFF files so large?",
        a: "They are frequently uncompressed, which is exactly what makes them good archival masters and bad email attachments.",
      },
      {
        q: "Can I convert a multi-page TIFF?",
        a: "The first page is converted. JPG has no concept of multiple pages.",
      },
    ],
  },
];

export const CONVERSION_SLUGS = CONVERSIONS.map((c) => c.slug);

export function conversionBySlug(slug: string): Conversion | undefined {
  return CONVERSIONS.find((c) => c.slug === slug);
}
