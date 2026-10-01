import { Suspense } from 'react';

import { FavoritesPage } from '../../../../components/storefront/favorites-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function FavoritesRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <FavoritesPage />
    </Suspense>
  );
}
