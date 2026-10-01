'use client';

import { ApiError } from '@fastfood/api-client';
import { AccessDenied, Button, EmptyState, ErrorState, LoadingState } from '@fastfood/ui-web';
import type { ReactNode } from 'react';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'empty' }
  | { status: 'ready'; data: T };

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.envelope.error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Beklenmeyen bir hata oluştu.';
}

export function isForbidden(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 403 || error.envelope.error.code === 'AUTH_PERMISSION_DENIED')
  );
}

export function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.envelope.error.code === 'AUTH_UNAUTHENTICATED')
  );
}

export function ForbiddenNotice({ error }: { error: unknown }) {
  const code =
    error instanceof ApiError ? (error.envelope.error.code ?? 'AUTH_PERMISSION_DENIED') : undefined;
  return (
    <AccessDenied
      kind="permission"
      permissionCode={code}
      description={errorMessage(error)}
      action={
        <a href="/login">
          <Button type="button" size="sm" variant="secondary">
            Farklı hesapla giriş
          </Button>
        </a>
      }
    />
  );
}

export function AsyncBoundary<T>(props: {
  state: LoadState<T>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
}): ReactNode {
  const { state, emptyTitle, emptyDescription, emptyAction, onRetry, children } = props;
  if (state.status === 'loading') {
    return <LoadingState title="Yükleniyor" description="Veriler getiriliyor…" />;
  }
  if (state.status === 'error') {
    if (isForbidden(state.error)) {
      return <ForbiddenNotice error={state.error} />;
    }
    if (isUnauthorized(state.error)) {
      return (
        <AccessDenied
          kind="auth_required"
          action={
            <a href="/login">
              <Button type="button" size="sm">
                Giriş
              </Button>
            </a>
          }
        />
      );
    }
    return (
      <ErrorState
        title="Bir sorun oluştu"
        description={errorMessage(state.error)}
        action={
          onRetry ? (
            <Button type="button" onClick={onRetry}>
              Tekrar dene
            </Button>
          ) : undefined
        }
      />
    );
  }
  if (state.status === 'empty') {
    return (
      <EmptyState
        title={emptyTitle ?? 'Veri yok'}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return children(state.data);
}
