import { AdSlot } from "@/components/ad-slot";
import { BANNER_ADS } from "@/lib/ads";

/**
 * A banner pinned to the bottom of the viewport.
 *
 * It is the only slot that survives a scroll, so it is what makes a third unit
 * on a phone one somebody actually sees rather than one parked under the fold.
 * The caption the in-page slots carry is screen-reader only here: the bar reads
 * as an ad from the rule that separates it, and the two lines the caption adds
 * come straight out of the height the converter needs.
 *
 * The bar is fixed, so it covers whatever is under it — the page that renders
 * it has to reserve the same height at its end (see AnchorAdSpacer).
 */
export function AnchorAd() {
  if (!BANNER_ADS) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 py-1.5 backdrop-blur-sm">
      <AdSlot wide={BANNER_ADS.wide} narrow={BANNER_ADS.narrow} hideLabel />
    </div>
  );
}

/** The height AnchorAd takes out of the viewport: iframe + py-1.5 + the rule. */
export function AnchorAdSpacer() {
  if (!BANNER_ADS) return null;
  return <div aria-hidden className="h-[63px] md:h-[103px]" />;
}
