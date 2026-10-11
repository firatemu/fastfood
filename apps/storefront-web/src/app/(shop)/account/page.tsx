import { Suspense } from 'react';

import { AccountPage } from '../../../components/storefront/account-page';
import { AccountScreen } from '../../../components/storefront/account-screen';
import { ShopSkeleton } from '../../../components/storefront/shop-states';

export default function AccountOverviewRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <AccountPage />
      </AccountScreen>
    </Suspense>
  );
}
