'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createAdminClient, getStaffAccessToken } from '../../lib/api';
import { staffAccessSchema } from '../../lib/schemas';

export type StaffAccessSnapshot = {
  userId: string | null;
  permissions: ReadonlySet<string>;
  branchIds: readonly string[];
  isSuperAdmin: boolean;
  loading: boolean;
  error: unknown | null;
};

const emptyAccess: StaffAccessSnapshot = {
  userId: null,
  permissions: new Set(),
  branchIds: [],
  isSuperAdmin: false,
  loading: false,
  error: null,
};

const StaffAccessContext = createContext<StaffAccessSnapshot>(emptyAccess);

export function StaffAccessProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const token = enabled ? getStaffAccessToken() : null;
  const [loaded, setLoaded] = useState<{ token: string; value: StaffAccessSnapshot } | null>(null);

  useEffect(() => {
    if (!enabled || !token) return;
    let cancelled = false;
    void createAdminClient()
      .request({ path: 'auth/staff/me', schema: staffAccessSchema })
      .then((result) => {
        if (cancelled) return;
        setLoaded({
          token,
          value: {
            userId: result.data.userId,
            permissions: new Set(result.data.permissions),
            branchIds: result.data.branchIds,
            isSuperAdmin: result.data.isSuperAdmin,
            loading: false,
            error: null,
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoaded({ token, value: { ...emptyAccess, loading: false, error } });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, token]);

  const value = useMemo(
    () =>
      token && loaded?.token === token ? loaded.value : { ...emptyAccess, loading: Boolean(token) },
    [loaded, token],
  );
  return <StaffAccessContext.Provider value={value}>{children}</StaffAccessContext.Provider>;
}

export function useStaffAccess(): StaffAccessSnapshot {
  return useContext(StaffAccessContext);
}

export function hasStaffPermission(access: StaffAccessSnapshot, permission: string): boolean {
  return access.isSuperAdmin || access.permissions.has(permission);
}
