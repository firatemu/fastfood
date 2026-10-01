/** Prefer catalog API media. No local demo pools. */

export function resolveProductImageFromDetail(
  _product: { id: string; slug: string },
  media?: { url: string }[],
): string | undefined {
  const first = media?.[0]?.url;
  return first && first.length > 0 ? first : undefined;
}
