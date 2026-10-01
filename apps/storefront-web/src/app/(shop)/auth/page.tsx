import { Suspense } from 'react';

import { AuthPage } from '../../../components/storefront/auth-page';
import { ShopSkeleton } from '../../../components/storefront/shop-states';

export default function AuthRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AuthPage />
    </Suspense>
  );
}
