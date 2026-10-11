'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { ShopSkeleton } from './shop-states';

/**
 * The shared account frame.
 *
 * This component owns exactly four things and nothing else:
 *   1. the customer auth gate (`RequireCustomer`)
 *   2. the `<main>` landmark
 *   3. the page toolbar (eyebrow / title / actions)
 *   4. the persistent rail, including its narrow-viewport collapse
 *
 * It deliberately does NOT own content structure. There is no card primitive
 * here, no grid helper, no section wrapper. Each account page composes its own
 * body out of `.ff-section` and `.ff-rows`, which is what keeps ten screens
 * from collapsing into one repeated template.
 */

export function RequireCustomer({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) {
      const next = params.get('next') || window.location.pathname;
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
      return;
    }
    setReady(true);
  }, [params, router]);

  if (!ready) return <ShopSkeleton />;
  return <>{children}</>;
}

export type AccountShellProps = {
  /** Value for `data-ff-surface`, the existing per-page token scope hook. */
  surface: string;
  /** Small label above the title in the toolbar. */
  eyebrow?: string;
  title: string;
  /** Optional one-paragraph lead rendered above the page body. */
  description?: ReactNode;
  /** Buttons / links that belong to the toolbar, right-aligned. */
  actions?: ReactNode;
  children: ReactNode;
};

export function AccountShell({
  surface,
  eyebrow,
  title,
  description,
  actions,
  children,
}: AccountShellProps) {
  return (
    <div className="ff-acct pt-20" data-ff-surface={surface}>
      <div className="ff-frame">
          <aside className="ff-rail ff-scroll" data-ff-account-rail>
            <AccountNav />
          </aside>

          <div className="ff-content">
            <div className="ff-toolbar">
              <div className="ff-toolbar-id">
                <div className="ff-toolbar-eyebrow">{eyebrow ?? 'Hesap'}</div>
                <h1 className="ff-toolbar-title">{title}</h1>
              </div>
              {actions ? <div className="ff-toolbar-actions">{actions}</div> : null}
            </div>

            <main id="account-content" tabIndex={-1} className="ff-body">
              {description ? <p className="ff-lead">{description}</p> : null}
              {children}
            </main>
          </div>
      </div>
    </div>
  );
}