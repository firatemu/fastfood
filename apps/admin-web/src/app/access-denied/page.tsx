'use client';

/**
 * Access denied — rebuilt in A9 (ADR-019).
 *
 * The backend contract this page depends on is recorded in
 * `access-denied.module.css`. The one behavioural change from the retired page:
 * the required permission code is read from `?code=` and shown when present.
 * Before, `ops-shell` redirected here with no query string, so the page rendered
 * the placeholder `required.permission` — a string with no backend meaning. It
 * is presentation only; `RbacGuard` is the control point and is unaffected.
 */

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import styles from './access-denied.module.css';

/**
 * `useSearchParams` would need a Suspense boundary at build time, so the query
 * string is read straight off the location and subscribed to as an external
 * store instead of being copied into component state by an effect. The snapshot
 * is a string, so it compares by value and only re-renders when the permission
 * code actually changes; back/forward navigation arrives via `popstate`. The
 * server snapshot stays `null`, which keeps the code absent from the server
 * render rather than mismatched.
 */
function subscribeToLocation(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange);
  return () => window.removeEventListener('popstate', onStoreChange);
}

function getPermissionCode(): string | null {
  const value = new URLSearchParams(window.location.search).get('code');
  return value && value.trim() !== '' ? value : null;
}

function getServerPermissionCode(): string | null {
  return null;
}

export default function AccessDeniedPage() {
  const code = useSyncExternalStore(
    subscribeToLocation,
    getPermissionCode,
    getServerPermissionCode,
  );

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="access-denied-title">
        <span className={styles.eyebrow}>Yetki gerekli</span>
        <h1 id="access-denied-title" className={styles.title}>
          Bu sayfaya erişim izniniz yok
        </h1>
        <p className={styles.description}>
          Bu sayfayı görüntülemek için gereken yetkiye sahip değilsiniz. Farklı bir hesapla giriş
          yapabilir veya yetkiyi yöneticinizden talep edebilirsiniz.
        </p>

        {code ? (
          <p className={styles.code}>
            <span className={styles.codeLabel}>Gerekli izin</span>
            <code className={styles.codeValue}>{code}</code>
          </p>
        ) : null}

        <div className={styles.actions}>
          <Link className={styles.button} href="/">
            Genel bakışa dön
          </Link>
          <Link className={styles.buttonGhost} href="/login">
            Giriş sayfası
          </Link>
        </div>
      </section>
    </main>
  );
}
