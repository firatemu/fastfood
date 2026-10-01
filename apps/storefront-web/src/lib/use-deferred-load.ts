'use client';

import { useEffect } from 'react';

/** Defer async loads past the effect body (react-hooks/set-state-in-effect). */
export function useDeferredLoad(
  load: () => void | Promise<void>,
  deps: ReadonlyArray<unknown>,
): void {
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps array
  }, deps);
}
