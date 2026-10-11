import { Suspense } from 'react';

import { AccountScreen } from '../../../../components/storefront/account-screen';
import { AccountSecurityPage } from '../../../../components/storefront/account-security-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function AccountSecurityRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <AccountSecurityPage />
      </AccountScreen>
    </Suspense>
  );
}
