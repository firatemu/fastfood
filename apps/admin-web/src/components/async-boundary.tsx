'use client';

import { ApiError } from '@fastfood/api-client';

/**
 * Load-state yardimcilari.
 *
 * Once burada `AsyncBoundary` ve `ForbiddenNotice` de yasiyordu ve
 * `@fastfood/ui-web` primitiflerini (`LoadingState`, `ErrorState`,
 * `EmptyState`, `AccessDenied`, `Button`) kullaniyordu. Bu, emekli tasarim
 * sisteminin butun admin yuzeyine global olarak tasinmasinin son ayak noktasi
 *ydi: `styles.css` bu bilesenlerin `ff-*` siniflarini tasiyordu.
 *
 * Durum yuzeyleri icin tek Navy ilkeli `OpsBoundary` kullanilir
 * (`components/ops/ops-boundary.tsx`); `/catalog/products` de buna gecirildi.
 * Bu dosya artik yalnizca veri sekli ve hata cozumlemesi tasir.
 */

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
