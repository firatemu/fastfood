import { Suspense } from 'react';

import { OrdersListPage } from '../../../components/storefront/orders-list-page';
import { ShopSkeleton } from '../../../components/storefront/shop-states';

export default function OrdersRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <OrdersListPage />
    </Suspense>
  );
}
