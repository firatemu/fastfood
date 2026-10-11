'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders `children` into `document.body` once the component is mounted
 * on the client. Used by floating elements (action menus, dialogs) so
 * they can position themselves relative to the viewport rather than
 * the datagrid scroll container.
 */
/**
 * `document.body` is stable for the whole document lifetime, so this
 * store has nothing to subscribe to and the empty subscribe pair is
 * enough. The server snapshot stays `null`, which keeps SSR and the
 * hydration pass portal-free; the client snapshot hands back the body
 * on the first client render.
 */
const subscribeToBody = () => () => {};
const getBodySnapshot = (): HTMLElement => document.body;
const getServerBodySnapshot = (): HTMLElement | null => null;

export function ClientPortal({ children }: { children: ReactNode }) {
  const host = useSyncExternalStore(subscribeToBody, getBodySnapshot, getServerBodySnapshot);
  if (!host) return null;
  return createPortal(children, host);
}

/**
 * Tracks document-level click + Escape so floating menus can dismiss
 * themselves. Returns the helpers to wire up; pass `onDismiss` to the
 * menu's `onClose`.
 */
export function useDismissOnOutside(
  active: boolean,
  rootRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, rootRef, onDismiss]);
}
