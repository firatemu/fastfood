/**
 * CTA label for a product card's customize action.
 *
 * Mirrors `customizeLabel()` in
 * `apps/storefront-web/src/components/storefront/product-card.tsx`: a drink is
 * chosen by size, a side by portion, everything else is customized. Both
 * clients answer the same question — "what does the first tap on this product
 * let me decide?" — so the label must not differ between them.
 *
 * The labels are returned already upper-cased instead of being styled with
 * `textTransform: 'uppercase'`. React Native's transform is locale-unaware and
 * maps Turkish `i` to `I`, which would render "ÖZELLEŞTIR" instead of the
 * correct "ÖZELLEŞTİR".
 */

export type CustomizeLabelProduct = {
  /** Drink volume in ml; non-null marks the product as a drink. */
  volumeMl: number | null;
  /** Merchandising badge, e.g. `Yan Lezzet` for sides. */
  badge: string | null;
};

export function customizeLabel(product: CustomizeLabelProduct): string {
  if (product.volumeMl !== null) return 'BOYUT';
  if (product.badge === 'Yan Lezzet') return 'PORSİYON SEÇ';
  return 'ÖZELLEŞTİR';
}