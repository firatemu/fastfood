import { Suspense } from 'react';

import { AccountScreen } from '../../../../components/storefront/account-screen';
import { ClubPage } from '../../../../components/storefront/club-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function ClubRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <ClubPage />
      </AccountScreen>
    </Suspense>
  );
}
