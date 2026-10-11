import { Suspense } from 'react';

import { AccountScreen } from '../../../../components/storefront/account-screen';
import { AccountSettingsPage } from '../../../../components/storefront/account-settings-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function AccountSettingsRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <AccountSettingsPage />
      </AccountScreen>
    </Suspense>
  );
}
