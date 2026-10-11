'use client';

import { useRouter } from 'next/navigation';
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

import { errorMessage } from '../../lib/load-state';
import { fetchCustomerProfile, type CustomerProfile } from '../../lib/storefront/account';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { MaterialIcon } from './material-icon';

/**
 * Shared state and interaction layer for the account surface.
 *
 * Why this exists
 * ---------------
 * The previous account module had no way to say "this failed", no way to ask
 * "are you sure", and no in-flight lock. Destructive actions fired the moment
 * they were clicked, a failed save disappeared, and walking away from an edited
 * form lost the edits without a word.
 *
 * Hosting this in one provider (rather than one hook per page) is what keeps
 * the ten screens behaving identically: one profile fetch, one toast region,
 * one dialog, one dirty flag per account visit.
 */

/* -------------------------------------------------------------------------- */
/* Public shape                                                                 */
/* -------------------------------------------------------------------------- */

export type ToastTone = 'ok' | 'danger' | 'info';

export type ConfirmOptions = {
  title: string;
  body: ReactNode;
  /** Label for the affirmative button. Keep it a verb. */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` tints the affirmative button and the dialog's leading icon. */
  tone?: 'default' | 'danger';
};

type Toast = { id: number; text: string; detail?: string; tone: ToastTone };

type ProfileState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: CustomerProfile };

type AccountUi = {
  toast: {
    ok: (text: string, detail?: string) => void;
    error: (text: string, detail?: string) => void;
    info: (text: string, detail?: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** True while the current screen holds edits that were never persisted. */
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  profile: ProfileState;
  /** Re-reads the profile after a mutation changed it. */
  refreshProfile: () => void;
};

const AccountUiContext = createContext<AccountUi | null>(null);

export function useAccountUi(): AccountUi {
  const ctx = useContext(AccountUiContext);
  if (!ctx) throw new Error('useAccountUi must be used inside <AccountUiProvider>');
  return ctx;
}

/**
 * Opt-in variant for components that render both inside and outside the
 * account surface.
 *
 * `AccountNav` is mounted by `AccountScreen` *and* by `/orders`, which is not
 * part of this surface and therefore has no provider. A hard throw there took
 * the whole orders page down over a missing identity block, so the nav reads
 * the context opportunistically and simply renders without the block when it
 * is absent.
 */
export function useOptionalAccountUi(): AccountUi | null {
  return useContext(AccountUiContext);
}

/** Initials for the rail identity mark. Falls back to a single glyph. */
export function initialsOf(name: string | null | undefined): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return 'B';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return 'B';
  if (parts.length === 1) return first.slice(0, 1).toLocaleUpperCase('tr-TR');
  const last = parts[parts.length - 1] ?? first;
  return (first.slice(0, 1) + last.slice(0, 1)).toLocaleUpperCase('tr-TR');
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                     */
/* -------------------------------------------------------------------------- */

let toastSeq = 0;

export function AccountUiProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dirty, setDirty] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({ status: 'loading' });
  const [profileNonce, setProfileNonce] = useState(0);
  const profileRun = useRef(0);

  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  /** Route the user tried to reach while holding unsaved edits. */
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);
  // The resolver for the pending `confirm()` promise. Kept in a ref because it
  // is written during a click and read during the dialog's own button handler.
  const settle = useRef<((value: boolean) => void) | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);

  useDeferredLoad(() => {
    // `useDeferredLoad` owns cancellation, so staleness is tracked by run id
    // rather than by returning a teardown from the loader.
    const run = (profileRun.current += 1);
    void fetchCustomerProfile()
      .then((next) => {
        if (profileRun.current !== run) return;
        setProfile({ status: 'ready', profile: next });
      })
      .catch((error: unknown) => {
        if (profileRun.current !== run) return;
        setProfile({ status: 'error', message: errorMessage(error) });
      });
  }, [profileNonce]);

  const refreshProfile = useCallback(() => setProfileNonce((n) => n + 1), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((text: string, detail: string | undefined, tone: ToastTone) => {
    const id = (toastSeq += 1);
    setToasts((current) => [...current.slice(-2), { id, text, detail, tone }]);
    // Errors linger: they usually need reading, not just noticing.
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, tone === 'danger' ? 7000 : 3600);
  }, []);

  const toast = useMemo<AccountUi['toast']>(
    () => ({
      ok: (text, detail) => pushToast(text, detail, 'ok'),
      error: (text, detail) => pushToast(text, detail, 'danger'),
      info: (text, detail) => pushToast(text, detail, 'info'),
    }),
    [pushToast],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // A second request while one is open resolves the first as cancelled
      // rather than leaving its promise dangling forever.
      settle.current?.(false);
      settle.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const closeDialog = useCallback((result: boolean) => {
    setConfirmState(null);
    settle.current?.(result);
    settle.current = null;
  }, []);

  /* -- Escape closes; focus lands on the affirmative action --------------- */
  useEffect(() => {
    if (!confirmState && !discardTarget) return;
    confirmButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog(false);
        setDiscardTarget(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmState, discardTarget, closeDialog]);

  /* -- Browser-level unload --------------------------------------------- */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome ignores the string and shows its own copy, but assigning
      // returnValue is still what makes the prompt appear at all.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /* -- In-app navigation away from unsaved edits --------------------------
     beforeunload never fires for a client-side route change, so a link click
     is intercepted in the capture phase and turned into a question instead of
     a silent data loss. Modifier-clicks and non-navigating anchors are left
     alone: they are explicit "open elsewhere" gestures, not accidental exits.
     The browser back button cannot be intercepted from the App Router, which
     is a known limit of this approach rather than an oversight.            */

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.hasAttribute('download')) return;
      const target = anchor.getAttribute('target');
      if (target && target !== '_self') return;
      const href = anchor.getAttribute('href') ?? '';
      if (!href || href.startsWith('#')) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Re-rendering the same route is not leaving.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      setDiscardTarget(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  const discardAndLeave = useCallback(() => {
    const target = discardTarget;
    setDiscardTarget(null);
    setDirty(false);
    if (target) router.push(target);
  }, [discardTarget, router]);

  const value = useMemo<AccountUi>(
    () => ({ toast, confirm, dirty, setDirty, profile, refreshProfile }),
    [toast, confirm, dirty, profile, refreshProfile],
  );

  const discardPrompt: ConfirmOptions | null = discardTarget
    ? {
        title: 'Kaydedilmemiş değişiklikler',
        body: 'Bu ekrandaki değişiklikler kaydedilmedi. Çıkarsanız kaybolacaklar.',
        confirmLabel: 'Değişiklikleri bırak',
        cancelLabel: 'Düzenlemeye devam et',
        tone: 'danger',
      }
    : null;

  const activeDialog = discardPrompt ?? confirmState;

  return (
    <AccountUiContext.Provider value={value}>
      {children}

      <div className="ff-toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => (
          <div key={item.id} className="ff-toast" data-tone={item.tone} data-ff-toast={item.tone}>
            <MaterialIcon name={TOAST_ICON[item.tone]} />
            <div className="ff-toast-text">
              <div className="ff-toast-title">{item.text}</div>
              {item.detail ? <div className="ff-toast-desc">{item.detail}</div> : null}
            </div>
            <button
              type="button"
              className="ff-icon-btn ff-icon-btn-sm"
              onClick={() => dismissToast(item.id)}
              aria-label="Bildirimi kapat"
            >
              <MaterialIcon name="close" />
            </button>
          </div>
        ))}
      </div>

      {activeDialog ? (
        <div
          className="ff-overlay"
          data-ff-dialog="confirm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog(false);
              setDiscardTarget(null);
            }
          }}
        >
          <div
            className="ff-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ff-dialog-title"
          >
            <div className="ff-dialog-head">
              <MaterialIcon
                name={activeDialog.tone === 'danger' ? 'warning' : 'help'}
                className={activeDialog.tone === 'danger' ? 'ff-dialog-icon-danger' : undefined}
              />
              <h2 className="ff-dialog-title" id="ff-dialog-title">
                {activeDialog.title}
              </h2>
            </div>
            <div className="ff-dialog-body">{activeDialog.body}</div>
            <div className="ff-dialog-foot">
              <button
                type="button"
                className="ff-btn ff-btn-ghost"
                onClick={() => {
                  closeDialog(false);
                  setDiscardTarget(null);
                }}
              >
                {activeDialog.cancelLabel ?? 'Vazgeç'}
              </button>
              <button
                type="button"
                ref={confirmButton}
                className={`ff-btn ${activeDialog.tone === 'danger' ? 'ff-btn-danger' : 'ff-btn-primary'}`}
                onClick={() => {
                  if (discardPrompt) discardAndLeave();
                  else closeDialog(true);
                }}
              >
                {activeDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AccountUiContext.Provider>
  );
}

const TOAST_ICON: Record<ToastTone, string> = {
  ok: 'check_circle',
  danger: 'error',
  info: 'info',
};