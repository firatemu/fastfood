'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Submit lock — the guard against a double submission.
 *
 * `disabled` on a button is not enough on its own: a fast double click fires
 * two handlers before React re-renders the disabled state, and a slow network
 * makes the window wide. The ref is checked synchronously inside the handler,
 * so the second call is refused at the same tick the first one starts.
 */
export function useSubmitLock<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setPending(true);
      try {
        return await action(...args);
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending };
}