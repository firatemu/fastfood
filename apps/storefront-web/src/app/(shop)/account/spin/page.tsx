import { Suspense } from 'react';

import { ShopSkeleton } from '../../../../components/storefront/shop-states';
import { SpinPage } from '../../../../components/storefront/spin-page';

export default function SpinRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <SpinPage />
    </Suspense>
  );
}
