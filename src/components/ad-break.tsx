import { AdSlot } from "@/components/ad-slot";
import { NativeAd } from "@/components/native-ad";
import { BANNER_ADS, NATIVE_AD } from "@/lib/ads";

/**
 * The two placed units, each wrapped so a page can drop one in without
 * repeating the "is it configured" check — unset, which is the default
 * locally, they render nothing at all.
 */
export function BannerBreak({ className }: { className?: string }) {
  if (!BANNER_ADS) return null;
  return <AdSlot wide={BANNER_ADS.wide} narrow={BANNER_ADS.narrow} className={className} />;
}

export function NativeBreak({ className }: { className?: string }) {
  if (!NATIVE_AD) return null;
  return <NativeAd adKey={NATIVE_AD.key} src={NATIVE_AD.src} className={className} />;
}
