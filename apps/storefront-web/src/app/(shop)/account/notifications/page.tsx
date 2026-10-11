import { Suspense } from 'react';

import { AccountScreen } from '../../../../components/storefront/account-screen';
import { NotificationsPage } from '../../../../components/storefront/notifications-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function NotificationsRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AccountScreen>
        <NotificationsPage />
      </AccountScreen>
    </Suspense>
  );
}
