import { Suspense } from 'react';

import { AccountScreen } from '../../../../components/storefront/account-screen';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';
import { SpinPage } from '../../../../components/storefront/spin-page';

export default function SpinRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <SpinPage />
      </AccountScreen>
    </Suspense>
  );
}
