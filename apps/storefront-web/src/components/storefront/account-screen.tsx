'use client';

import type { ReactNode } from 'react';

import { RequireCustomer } from './account-shell';
import { AccountUiProvider } from './account-ui';

/**
 * The provider stack every authenticated account route mounts.
 *
 * `RequireCustomer` is the auth gate and `AccountUiProvider` owns the shared
 * profile, toast region, confirm dialog and dirty flag. Both live here rather
 * than inside `AccountShell` because a page component needs `useAccountUi()`
 * *before* it can decide to render a shell at all — a provider nested inside
 * the shell would be unmounted at exactly the moment its consumer needs it.
 */
export function AccountScreen({ children }: { children: ReactNode }) {
  return (
    <RequireCustomer>
      <AccountUiProvider>{children}</AccountUiProvider>
    </RequireCustomer>
  );
}