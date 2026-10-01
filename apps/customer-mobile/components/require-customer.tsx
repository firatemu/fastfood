import { useRouter } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { authRouteParams } from '../lib/auth-nav';
import { restoreSession } from '../lib/session';
import { useAuthBootstrap, useCustomerSession } from '../lib/use-session';
import { colors } from '../theme';

import { ErrorBlock, LoadingBlock } from './ui';

export function RequireCustomer(props: { next: string; children: ReactNode }): ReactElement {
  const session = useCustomerSession();
  const bootstrap = useAuthBootstrap();
  const router = useRouter();

  useEffect(() => {
    if (bootstrap === 'pending' || bootstrap === 'offline') return;
    if (!session) {
      router.replace({ pathname: '/auth', params: authRouteParams(props.next) });
    }
  }, [bootstrap, session, props.next, router]);

  if (bootstrap === 'pending') {
    return <LoadingBlock label="Oturum kontrol ediliyor…" />;
  }
  if (bootstrap === 'offline' && !session) {
    return (
      <ErrorBlock
        title="Oturum doğrulanamadı"
        message="Ağ bağlantısını kontrol edip yeniden deneyin."
        onRetry={() => {
          void restoreSession();
        }}
      />
    );
  }
  if (!session) {
    return <LoadingBlock label="Girişe yönlendiriliyor…" />;
  }
  return <>{props.children}</>;
}

export const requireCustomerCanvas = { flex: 1, backgroundColor: colors.canvas } as const;
