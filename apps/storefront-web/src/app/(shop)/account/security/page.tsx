import { Suspense } from 'react';

import { AccountSecurityPage } from '../../../../components/storefront/account-security-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function AccountSecurityRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountSecurityPage />
    </Suspense>
  );
}
