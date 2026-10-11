import type { StorefrontHome } from './schemas';

type Category = StorefrontHome['categories'][number];

/**
 * Keeps the category rail usable while a category filter is active.
 *
 * `GET /storefront/home?categoryId=…` narrows the products to the selected
 * category, and the service derives the returned `categories` from the products
 * it just filtered (`visibleCategoryIds`). The filtered response therefore
 * carries only the selected category, so rendering `home.categories` directly
 * would collapse the rail to a single chip the moment the customer picks one —
 * leaving no way to switch to another category.
 *
 * The web storefront does not hit this because `MenuPage` sources its rail from
 * `fetchStorefrontCategories()` instead of from the home payload. Mobile reads
 * the categories from the home payload, so it must hold the unfiltered list.
 *
 * The rule is deliberately conservative: a filtered response is a subset of the
 * unfiltered one, so the rail may grow but must never shrink.
 */
export function reconcileCategoryRail(
  previous: readonly Category[] | null,
  incoming: readonly Category[],
  hasActiveFilter: boolean,
): Category[] {
  if (!hasActiveFilter) {
    return incoming.length > 0 ? [...incoming] : (previous ? [...previous] : []);
  }
  // While filtering, keep the previously captured full rail unless the server
  // somehow sent a strictly larger one.
  if (previous && previous.length >= incoming.length) {
    return [...previous];
  }
  return [...incoming];
}

/** True when the response only describes the filtered category. */
export function isCategoryRailCollapsed(
  previous: readonly Category[] | null,
  incoming: readonly Category[],
  hasActiveFilter: boolean,
): boolean {
  return hasActiveFilter && previous !== null && incoming.length < previous.length;
}