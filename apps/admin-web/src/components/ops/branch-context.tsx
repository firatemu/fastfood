'use client';

import { adminPagePermission } from '@fastfood/domain-types';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { createAdminClient, DEFAULT_BRANCH_ID } from '../../lib/api';
import { BRANCH_STORAGE_KEY, resolveBranchId, type BranchOption } from '../../lib/branch-storage';
import { adminBranchesSchema } from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { hasStaffPermission, useStaffAccess } from './staff-access-context';

type BranchContextValue = {
  branchId: string;
  branches: BranchOption[];
  selected: BranchOption | null;
  setBranchId: (id: string) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const access = useStaffAccess();
  const stored = useSyncExternalStore(
    subscribeStorage,
    () => (typeof window === 'undefined' ? null : window.localStorage.getItem(BRANCH_STORAGE_KEY)),
    () => null,
  );
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (access.loading) return;
    if (access.error) {
      setBranches([]);
      setError('Oturum doğrulanamadı.');
      setLoading(false);
      return;
    }
    const allowedBranchId = access.branchIds[0];
    if (!access.isSuperAdmin && !allowedBranchId) {
      setBranches([]);
      setError('Bu kullanıcıya şube atanmamış.');
      setLoading(false);
      return;
    }
    if (
      !access.isSuperAdmin &&
      (!hasStaffPermission(access, 'branches.read') ||
        !hasStaffPermission(access, adminPagePermission('branch-list', 'view')))
    ) {
      setBranches(allowedBranchId ? [{ id: allowedBranchId, name: 'Atanmış şube' }] : []);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createAdminClient().request({
        path: 'admin/branches',
        schema: adminBranchesSchema,
      });
      setBranches(
        res.data.map((row) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          status: row.status,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şubeler yüklenemedi.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [access]);

  useDeferredLoad(load, [load, tick]);

  const branchId = access.isSuperAdmin
    ? resolveBranchId(stored, branches, DEFAULT_BRANCH_ID)
    : (access.branchIds[0] ?? DEFAULT_BRANCH_ID);

  const setBranchId = useCallback(
    (id: string) => {
      if (!access.isSuperAdmin && id !== access.branchIds[0]) return;
      window.localStorage.setItem(BRANCH_STORAGE_KEY, id);
      window.dispatchEvent(new Event('storage'));
    },
    [access],
  );

  const value = useMemo<BranchContextValue>(
    () => ({
      branchId,
      branches,
      selected: branches.find((b) => b.id === branchId) ?? null,
      setBranchId,
      loading,
      error,
      reload: () => setTick((n) => n + 1),
    }),
    [branchId, branches, error, loading, setBranchId],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranchContext(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranchContext requires BranchProvider');
  }
  return ctx;
}
