/**
 * Finding the highest quality that still fits under a byte budget.
 *
 * Encoding is the expensive part, so this is a binary search over integer
 * quality rather than a linear walk: ~7 encodes covers the whole 1–100 range
 * instead of up to 100.
 *
 * Generic over the encoder so it can be tested without wasm.
 */

export interface Attempt<T> {
  result: T;
  bytes: number;
}

export interface SearchResult<T> extends Attempt<T> {
  quality: number;
  /** False when even the lowest quality overshot the budget. */
  met: boolean;
}

export interface SearchOptions {
  targetBytes: number;
  min?: number;
  max?: number;
  /** A cap on encodes, mostly to bound worst-case time on huge images. */
  maxAttempts?: number;
}

export async function searchQualityForSize<T>(
  encode: (quality: number) => Promise<Attempt<T>>,
  { targetBytes, min = 1, max = 100, maxAttempts = 8 }: SearchOptions,
): Promise<SearchResult<T>> {
  let low = min;
  let high = max;

  /** Best result that fits the budget — always preferred if we found one. */
  let best: SearchResult<T> | null = null;
  /** Smallest result seen overall, used when nothing fits. */
  let smallest: SearchResult<T> | null = null;

  let attempts = 0;
  while (low <= high && attempts < maxAttempts) {
    attempts++;
    const quality = Math.floor((low + high) / 2);
    const attempt = await encode(quality);

    if (!smallest || attempt.bytes < smallest.bytes) {
      smallest = { ...attempt, quality, met: attempt.bytes <= targetBytes };
    }

    if (attempt.bytes <= targetBytes) {
      // Fits — record it and try to spend the remaining budget on quality.
      if (!best || quality > best.quality) {
        best = { ...attempt, quality, met: true };
      }
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  if (best) return best;

  // Nothing fit. Hand back the smallest we managed and let the caller say so,
  // rather than failing outright — a slightly-too-large file still beats an
  // error message.
  if (smallest) return { ...smallest, met: false };

  throw new Error("Target size search ran no encodes.");
}
