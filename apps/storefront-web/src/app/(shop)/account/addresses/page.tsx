import { Suspense } from 'react';

import { AccountAddressesPage } from '../../../../components/storefront/account-addresses-page';
import { AccountScreen } from '../../../../components/storefront/account-screen';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function AccountAddressesRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <AccountAddressesPage />
      </AccountScreen>
    </Suspense>
  );
}
