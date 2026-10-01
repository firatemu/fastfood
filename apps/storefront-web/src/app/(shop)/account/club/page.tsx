import { Suspense } from 'react';

import { ClubPage } from '../../../../components/storefront/club-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function ClubRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ClubPage />
    </Suspense>
  );
}
