'use client';

import { ApiError } from '@fastfood/api-client';
import type { ReactNode } from 'react';

import { errorMessage, isForbidden, isUnauthorized, type LoadState } from '../async-boundary';

import { OpsEmpty, OpsError, OpsLoading } from './ops-ui';

export function OpsBoundary<T>(props: {
  state: LoadState<T>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
}): ReactNode {
  const { state, emptyTitle, emptyDescription, emptyAction, onRetry, children } = props;
  if (state.status === 'loading') return <OpsLoading />;
  if (state.status === 'error') {
    if (isUnauthorized(state.error)) {
      return (
        <OpsError
          title="Oturum gerekli"
          description="Bu ekranı görmek için personel girişi yapın."
        />
      );
    }
    if (isForbidden(state.error)) {
      const code = state.error instanceof ApiError ? state.error.envelope.error.code : undefined;
      return (
        <OpsError
          title="Yetki yetersiz"
          description={code ? 'Bu işlem için izin yok.' : errorMessage(state.error)}
        />
      );
    }
    return <OpsError description={errorMessage(state.error)} onRetry={onRetry} />;
  }
  if (state.status === 'empty') {
    return (
      <OpsEmpty
        title={emptyTitle ?? 'Kayıt yok'}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return children(state.data);
}

export { errorMessage };
