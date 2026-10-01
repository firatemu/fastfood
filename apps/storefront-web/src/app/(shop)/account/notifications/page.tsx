import { Suspense } from 'react';

import { NotificationsPage } from '../../../../components/storefront/notifications-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function NotificationsRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <NotificationsPage />
    </Suspense>
  );
}
