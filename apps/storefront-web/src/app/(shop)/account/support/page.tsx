import { Suspense } from 'react';

import { AccountScreen } from '../../../../components/storefront/account-screen';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';
import { SupportPage } from '../../../../components/storefront/support-page';

export default function SupportRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <SupportPage />
      </AccountScreen>
    </Suspense>
  );
}
