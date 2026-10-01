import { Suspense } from 'react';

import { SearchPage } from '../../../components/storefront/search-page';
import { ShopSkeleton } from '../../../components/storefront/shop-states';

export const metadata = {
  title: 'Arama | BURGER HOME',
  description: 'BURGER HOME menüsünde ürün ara.',
};

export default function SearchRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <SearchPage />
    </Suspense>
  );
}
