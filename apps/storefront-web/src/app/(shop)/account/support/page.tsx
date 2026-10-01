import { Suspense } from 'react';

import { ShopSkeleton } from '../../../../components/storefront/shop-states';
import { SupportPage } from '../../../../components/storefront/support-page';

export default function SupportRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <SupportPage />
    </Suspense>
  );
}
