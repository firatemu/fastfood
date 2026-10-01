'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { completeOAuthCallback } from '../../lib/storefront/auth';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { ShopError, ShopSkeleton } from './shop-states';

export function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useDeferredLoad(() => {
    const customerId = params.get('customerId');
    const refreshToken = params.get('refreshToken');
    const next = params.get('next') || '/account';
    if (!customerId || !refreshToken) {
      setError('Oturum kurulamadı.');
      return;
    }
    void completeOAuthCallback(customerId, refreshToken)
      .then(() => {
        window.history.replaceState(null, '', '/auth/callback');
        router.replace(next.startsWith('/') ? next : '/account');
      })
      .catch(() => setError('Oturum kurulamadı.'));
  }, [params, router]);

  if (error) {
    return <ShopError title="OAuth" message={error} onRetry={() => router.replace('/auth')} />;
  }
  if (isCustomerAuthenticated()) {
    return <ShopSkeleton />;
  }
  return <ShopSkeleton />;
}
