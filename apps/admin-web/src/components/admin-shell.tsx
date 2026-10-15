'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSyncExternalStore, type ReactNode } from 'react';

import { ADMIN_NAV_SECTIONS, isNavActive } from '../lib/admin-nav';
import { isOpsShellPath } from '../lib/admin-routes';
import { clearStaffSession, getStaffAccessToken } from '../lib/api';

import { BranchProvider } from './ops/branch-context';
import { OpsShell } from './ops/ops-shell';
import { OpsSyncProvider } from './ops/ops-sync';
import { OpsToastProvider } from './ops/ops-toast';
import { StaffAccessProvider } from './ops/staff-access-context';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}

/**
 * A0 neutral rebuild scaffold.
 *
 * Replaces the retired production AppShell chrome. This is intentionally not
 * the Stitch Admin visual system and not the previous Operations sidebar.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loggedIn = useSyncExternalStore(
    subscribe,
    () => Boolean(getStaffAccessToken()),
    () => false,
  );
  const isLogin = pathname === '/login' || pathname.startsWith('/invite/');

  // Standalone auth surfaces render outside OpsShell, so they carry no theme
  // attribute of their own. The Navy token layer is scoped to
  // `[data-admin-theme='fastfood-navy']` with no `:root` fallback, so without
  // this every `var(--ff-*)` on /login, /invite/* and /access-denied resolves to
  // nothing and its whole declaration is dropped.
  if (isLogin) {
    return (
      <OpsToastProvider>
        <div className="ff-admin-login" data-admin-theme="fastfood-navy">
          {children}
        </div>
      </OpsToastProvider>
    );
  }

  if (pathname === '/access-denied') {
    return (
      <OpsToastProvider>
        <div className="ff-admin-standalone" data-admin-theme="fastfood-navy">
          {children}
        </div>
      </OpsToastProvider>
    );
  }

  if (isOpsShellPath(pathname)) {
    return (
      <OpsToastProvider>
        <StaffAccessProvider enabled={loggedIn}>
          <BranchProvider>
            <OpsSyncProvider>
              <OpsShell>{children}</OpsShell>
            </OpsSyncProvider>
          </BranchProvider>
        </StaffAccessProvider>
      </OpsToastProvider>
    );
  }

  return (
    <OpsToastProvider>
      <div className="ff-admin-scaffold">
        <a href="#admin-main" className="ff-admin-skip">
          İçeriğe geç
        </a>
        <p className="ff-admin-banner" role="status">
          A0 rebuild scaffold — Stitch Admin visual is not implemented. APIs, auth, and permissions
          are unchanged.
        </p>
        <div className="ff-admin-scaffold__layout">
          <aside className="ff-admin-scaffold__aside" aria-label="Uygulama menüsü">
            <p className="ff-admin-scaffold__brand">
              <Link href="/">BURGER HOME Admin</Link>
            </p>
            <p className="ff-admin-scaffold__session">{loggedIn ? 'oturum açık' : 'oturum yok'}</p>
            <nav aria-label="Birincil navigasyon">
              {ADMIN_NAV_SECTIONS.map((section) => (
                <div key={section.id} className="ff-admin-scaffold__section">
                  <p className="ff-admin-scaffold__section-label">{section.label}</p>
                  <ul>
                    {section.items.map((item) => {
                      const active = isNavActive(pathname, item);
                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={
                              active
                                ? 'ff-admin-scaffold__link ff-admin-scaffold__link--active'
                                : 'ff-admin-scaffold__link'
                            }
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="ff-admin-scaffold__footer">
              {loggedIn ? (
                <button
                  type="button"
                  className="ff-admin-scaffold__button"
                  onClick={() => {
                    clearStaffSession();
                    router.push('/login');
                  }}
                >
                  Çıkış
                </button>
              ) : (
                <Link href="/login" className="ff-admin-scaffold__link">
                  Giriş
                </Link>
              )}
            </div>
          </aside>
          <main id="admin-main" className="ff-admin-scaffold__main" aria-label="Yönetim içeriği">
            {children}
          </main>
        </div>
      </div>
    </OpsToastProvider>
  );
}
