'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * The toast rules are scoped to `[data-admin-theme='…']` like every other
 * ops-surface rule (ADR-019 scopes the `--ff-*` tokens that way, with no
 * `:root` fallback). Rendering the viewport next to `children` would place it
 * outside that subtree, so every declaration would be dropped and the stack
 * would lay out as ordinary static content. The portal target is therefore
 * resolved from the closest themed ancestor, and the element is created on
 * demand because the provider mounts before the theme wrapper paints.
 */
const TOAST_HOST_ATTR = 'data-ops-toast-host';

let toastHost: HTMLElement | null = null;

/**
 * The host is moved into the themed subtree whenever one exists. The provider
 * mounts above the theme wrapper, so on the first pass there may be nothing to
 * attach to and the host starts on `document.body`; each push re-checks and
 * relocates it. `document.body` itself is a legal fallback because the toast
 * rules only reference `--ff-*` tokens, which fall back to their `:root`
 * values on the login and access-denied surfaces.
 */
function resolveToastHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (toastHost && !toastHost.isConnected) toastHost = null;
  const themed = document.querySelector('[data-admin-theme]');
  const parent = themed ?? document.body;
  if (!toastHost) {
    toastHost = parent.querySelector<HTMLElement>(`[${TOAST_HOST_ATTR}]`);
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.setAttribute(TOAST_HOST_ATTR, '');
    }
  }
  if (toastHost.parentNode !== parent) parent.appendChild(toastHost);
  return toastHost;
}

/**
 * Admin toast — the single non-blocking notification surface for the whole
 * console.
 *
 * Visual authority is the rank-2 artifact of ADR-019:
 * `stitch_fastfood_admin_dashboard_prompts/r_n_m_saitli_i_men_fastfood/code.html`
 * (`id="toast"` — fixed bottom-right, `surface-container-highest`, `rounded-xl`,
 * `shadow-xl`, `border-l-4 border-primary-container`, Material Symbols icon,
 * 3500ms auto-dismiss). Tokens resolve through the `--ff-*` Navy layer.
 *
 * `@fastfood/ui-web` is deliberately not used: ADR-019 removed that package
 * from the Admin surface and its `ff-*` classes would reintroduce the retired
 * design system.
 */
export type OpsToastVariant = 'success' | 'error' | 'warning' | 'info';

type OpsToastTone = {
  id: number;
  message: string;
  variant: OpsToastVariant;
};

type OpsToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
};

const OpsToastContext = createContext<OpsToastApi | null>(null);

/** Stitch `showToast(...)` closes after 3500ms. Errors stay longer because a
 *  failed write must survive a slow read of the message. */
const DISMISS_MS = 3500;
const DISMISS_MS_ERROR = 6000;
const MAX_VISIBLE = 3;

const ICON: Record<OpsToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

export function OpsToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<OpsToastTone[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, number>());
  const paused = useRef(new Set<number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    paused.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const schedule = useCallback((id: number, variant: OpsToastVariant) => {
    const timer = window.setTimeout(
      () => {
        timers.current.delete(id);
        setToasts((current) => current.filter((toast) => toast.id !== id));
      },
      variant === 'error' ? DISMISS_MS_ERROR : DISMISS_MS,
    );
    timers.current.set(id, timer);
  }, []);

  const push = useCallback(
    (message: string, variant: OpsToastVariant) => {
      seq.current += 1;
      const id = seq.current;
      // Trim from the head so the stack never exceeds MAX_VISIBLE, and drop
      // any timer that belonged to an evicted toast.
      setToasts((current) => {
        const next = [...current, { id, message, variant }];
        for (const evicted of next.slice(0, Math.max(0, next.length - MAX_VISIBLE))) {
          const timer = timers.current.get(evicted.id);
          if (timer !== undefined) window.clearTimeout(timer);
          timers.current.delete(evicted.id);
          paused.current.delete(evicted.id);
        }
        return next.slice(-MAX_VISIBLE);
      });
      schedule(id, variant);
    },
    [schedule],
  );

  // The API object identity is load-bearing: consumers put `toast` in
  // useCallback/useEffect dependency arrays, so a new object on every toast
  // would invalidate those callbacks and re-run their effects. `push` and
  // `dismiss` are both stable, so this memo never changes for the lifetime of
  // the provider.
  const value = useMemo<OpsToastApi>(
    () => ({
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
      warning: (message: string) => push(message, 'warning'),
      info: (message: string) => push(message, 'info'),
      dismiss,
    }),
    [dismiss, push],
  );

  useEffect(() => {
    const timersRef = timers.current;
    const pausedRef = paused.current;
    return () => {
      for (const timer of timersRef.values()) window.clearTimeout(timer);
      timersRef.clear();
      pausedRef.clear();
    };
  }, []);

  const hold = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    paused.current.add(id);
  }, []);

  const release = useCallback(
    (id: number, variant: OpsToastVariant) => {
      if (!paused.current.has(id)) return;
      paused.current.delete(id);
      schedule(id, variant);
    },
    [schedule],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Dismiss the newest toast first; the stack is ordered oldest → newest.
      const top = toasts[toasts.length - 1];
      if (top) dismiss(top.id);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismiss, toasts]);

  const host = resolveToastHost();
  const stack =
    toasts.length === 0 || !host
      ? null
      : createPortal(
          <div className="ops-toast-viewport" aria-label="Sistem bildirimleri">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`ops-toast ops-toast--${toast.variant}`}
                data-ff-toast={toast.variant}
                data-ff-flash={toast.variant === 'success' ? 'true' : undefined}
                data-ff-error={toast.variant === 'error' ? 'true' : undefined}
                role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
                aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
                onMouseEnter={() => hold(toast.id)}
                onMouseLeave={() => release(toast.id, toast.variant)}
              >
                <span className="material-symbols-outlined ops-toast__icon" aria-hidden="true">
                  {ICON[toast.variant]}
                </span>
                <span className="ops-toast__message">{toast.message}</span>
                <button
                  type="button"
                  className="ops-toast__dismiss"
                  aria-label="Bildirimi kapat"
                  onClick={() => dismiss(toast.id)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>,
          host,
        );

  return (
    <OpsToastContext.Provider value={value}>
      {children}
      {stack}
    </OpsToastContext.Provider>
  );
}

export function useOpsToast(): OpsToastApi {
  const ctx = useContext(OpsToastContext);
  if (!ctx) throw new Error('useOpsToast requires OpsToastProvider');
  return ctx;
}
