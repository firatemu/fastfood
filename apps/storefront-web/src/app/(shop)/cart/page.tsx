import { Suspense } from 'react';

import { ShopCartPage } from '../../../components/storefront/shop-cart-page';
import { ShopSkeleton } from '../../../components/storefront/shop-states';

/**
 * The cart renders `RequireCustomer`, which reads `useSearchParams`. Every other
 * `(shop)` route wraps its client page in a Suspense boundary for exactly this
 * reason; this one was missing it, so `next build` failed prerendering `/cart`
 * with "useSearchParams() should be wrapped in a suspense boundary". That
 * failure pre-dated this work — it reproduced with a self-contained
 * `RequireCustomer` that still called `useSearchParams` — but it blocks the
 * build gate, so the wrapper is applied here to match the sibling routes.
 */
export default function CartPage() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopCartPage />
    </Suspense>
  );
}