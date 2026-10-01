import { Suspense } from 'react';

import { AuthCallbackPage } from '../../../../components/storefront/auth-callback-page';
import { ShopSkeleton } from '../../../../components/storefront/shop-states';

export default function AuthCallbackRoute() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <AuthCallbackPage />
    </Suspense>
  );
}
