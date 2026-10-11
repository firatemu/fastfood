import { formatDeltaMinor, formatTryMinor } from '@fastfood/contracts';

export { formatDeltaMinor, formatTryMinor };

/**
 * Price range for a product card.
 *
 * Returns a single price when the product has no variants, otherwise the
 * "min – max" range the customer actually has to choose between. Products
 * with exactly one variant are still rendered as a single price.
 */
export function formatPriceRange(
  priceMinMinor: string,
  priceMaxMinor: string,
  currency: string,
): string {
  const min = formatTryMinor(priceMinMinor, currency);
  if (priceMinMinor === priceMaxMinor) return min;
  return `${min} – ${formatTryMinor(priceMaxMinor, currency)}`;
}

/**
 * Cheapest / most expensive price across the base price and every variant.
 * Money stays in minor units (kuruş) and is compared as BigInt so large
 * values never lose precision through Number.
 */
export function resolvePriceBounds(
  basePriceMinor: string,
  variantPricesMinor: readonly string[],
): { min: string; max: string } {
  const prices = [basePriceMinor, ...variantPricesMinor].filter((p) => BigInt(p) > 0n);
  const [first, ...rest] = prices;
  if (first === undefined) {
    return { min: basePriceMinor, max: basePriceMinor };
  }
  let min = first;
  let max = first;
  for (const price of rest) {
    if (BigInt(price) < BigInt(min)) min = price;
    if (BigInt(price) > BigInt(max)) max = price;
  }
  return { min, max };
}

/** Turkish-aware, case/diacritic-insensitive-ish search over the menu. */
export function normalizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c');
}

export function productMatchesQuery(
  product: { name: string; description: string | null; categoryName: string },
  normalizedQuery: string,
): boolean {
  if (normalizedQuery.length === 0) return true;
  const haystack = normalizeSearchTerm(
    `${product.name} ${product.categoryName} ${product.description ?? ''}`,
  );
  return haystack.includes(normalizedQuery);
}

/** Group products under their category, preserving the category display order. */
export function groupByCategory<T extends { categoryId: string }>(
  categories: readonly { id: string }[],
  products: readonly T[],
): { categoryId: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const product of products) {
    const bucket = buckets.get(product.categoryId);
    if (bucket) bucket.push(product);
    else buckets.set(product.categoryId, [product]);
  }
  return categories
    .map((category) => ({ categoryId: category.id, items: buckets.get(category.id) ?? [] }))
    .filter((group) => group.items.length > 0);
}