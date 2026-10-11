import { Suspense } from 'react';

import { AccountScreen } from '../../../../components/storefront/account-screen';
import { FavoritesPage } from '../../../../components/storefront/favorites-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function FavoritesRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <FavoritesPage />
      </AccountScreen>
    </Suspense>
  );
}
