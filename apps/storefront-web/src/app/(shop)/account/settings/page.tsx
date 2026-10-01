import { Suspense } from 'react';

import { AccountSettingsPage } from '../../../../components/storefront/account-settings-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function AccountSettingsRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountSettingsPage />
    </Suspense>
  );
}
