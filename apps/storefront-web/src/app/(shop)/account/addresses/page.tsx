import { Suspense } from 'react';

import { AccountAddressesPage } from '../../../../components/storefront/account-addresses-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function AccountAddressesRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountAddressesPage />
    </Suspense>
  );
}
