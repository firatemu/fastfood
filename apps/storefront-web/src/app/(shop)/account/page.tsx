import { Suspense } from 'react';

import { AccountPage } from '../../../components/storefront/account-page';
import { ShopSkeleton } from '../../../components/storefront/shop-states';

export default function AccountRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountPage />
    </Suspense>
  );
}
