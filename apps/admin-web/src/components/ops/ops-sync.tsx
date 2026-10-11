'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type RefreshFn = () => void | Promise<void>;

type SyncValue = {
  lastSyncAt: number | null;
  stale: boolean;
  refreshing: boolean;
  registerRefresh: (fn: RefreshFn | null) => void;
  markSynced: () => void;
  markStale: () => void;
  refresh: () => Promise<void>;
};

const SyncContext = createContext<SyncValue | null>(null);

export function OpsSyncProvider({ children }: { children: ReactNode }) {
  const fnRef = useRef<RefreshFn | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const registerRefresh = useCallback((fn: RefreshFn | null) => {
    fnRef.current = fn;
  }, []);

  const markSynced = useCallback(() => {
    setLastSyncAt(Date.now());
    setStale(false);
  }, []);

  const markStale = useCallback(() => setStale(true), []);

  const refresh = useCallback(async () => {
    if (!fnRef.current) return;
    setRefreshing(true);
    try {
      await fnRef.current();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const value = useMemo(
    () => ({ lastSyncAt, stale, refreshing, registerRefresh, markSynced, markStale, refresh }),
    [lastSyncAt, markStale, markSynced, refresh, refreshing, registerRefresh, stale],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useOpsSync(): SyncValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useOpsSync requires OpsSyncProvider');
  return ctx;
}
