import { Suspense } from 'react';

import { ShopSkeleton } from '../../../../components/storefront/shop-states';
import { TableLookupPage } from '../../../../components/storefront/table-page';

export default function TableLookupRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <TableLookupPage />
    </Suspense>
  );
}
