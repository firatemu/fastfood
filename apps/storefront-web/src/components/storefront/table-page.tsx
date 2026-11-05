'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import { scanDiningTable, writeDiningContext } from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

/**
 * Table code lookup.
 *
 * Deliberately NOT an account page. This is a guest task: the code on the QR
 * establishes branch and table context, it is not a sign-in. So there is no
 * account rail, no `RequireCustomer` and no header identity — reachable from
 * the storefront header, and it works with an empty session.
 *
 * It does wear `.ff-acct`, though: the surface tokens are what make this screen
 * look like the same product as the account area rather than a second theme.
 * No rail, no provider, no profile fetch — only the token scope.
 *
 * (Mobile already ships this decoupled as `app/table/index.tsx`; this brings
 * Web in line with Mobile rather than the other way round.)
 */
export function TableLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <div className="ff-acct min-h-screen w-full bg-background pt-24 pb-16" data-ff-surface="table-lookup">
      <main className="mx-auto flex w-full max-w-lg flex-col justify-center px-4">
        <div className="ff-card">
          <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-outline-variant/60">
            <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center border border-secondary/25 shadow-sm">
              <MaterialIcon name="table_restaurant" />
            </div>
            <div>
              <span className="ff-toolbar-eyebrow">Restoran İçi Masa Servisi</span>
              <h1 className="text-xl font-extrabold text-white">Masa Kodu Girişi</h1>
            </div>
          </div>

          <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
            Masandaki QR etiketindeki masa kodunu girerek menüyü masana bağlayabilirsin. Siparişlerin doğrudan masana servis edilir.
          </p>

          <form
            className="flex items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(`/table/${encodeURIComponent(code.trim())}`);
            }}
          >
            <label className="ff-field flex-1">
              <span className="ff-field-label">Masa Numarası / Kodu</span>
              <input
                className="ff-input text-base uppercase font-semibold tracking-wider"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Ör. A12"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                data-ff-table-code
              />
            </label>
            <button type="submit" className="ff-btn ff-btn-primary" disabled={!code.trim()}>
              <MaterialIcon name="login" />
              Masayı Aç
            </button>
          </form>

          <div className="ff-notice mt-5" data-tone="info">
            <MaterialIcon name="info" />
            <span>Masa kodunu bulamadıysan servis personelimizden yardım isteyebilirsin.</span>
          </div>

          <div className="mt-4 pt-4 border-t border-outline-variant/40 text-center">
            <span className="text-xs text-on-surface-variant">Kod olmadan devam etmek için </span>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs font-semibold text-secondary hover:underline cursor-pointer"
            >
              Doğrudan Menüye Git →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Landing page for a scanned code. Unchanged in behaviour: it resolves the
 * table, writes the dining context, and forwards to the menu.
 */
export function TableContextPage() {
  const params = useParams<{ code: string }>();
  const code = typeof params.code === 'string' ? params.code : '';
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [label, setLabel] = useState('');

  useDeferredLoad(() => {
    if (!code) {
      setStatus('error');
      setError('Masa kodu yok.');
      return;
    }
    void scanDiningTable(code)
      .then((table) => {
        writeDiningContext(table);
        setLabel(`${table.branchName} · ${table.label}`);
        setStatus('ready');
        router.replace('/');
      })
      .catch((err: unknown) => {
        setError(errorMessage(err));
        setStatus('error');
      });
  }, [code, router]);

  if (status === 'loading') {
    return (
      <main
        className="ff-acct w-full pt-20 min-h-screen bg-background px-margin-sm"
        data-ff-surface="table"
      >
        <ShopSkeleton />
      </main>
    );
  }
  if (status === 'error') {
    return (
      <ShopError
        title="Masa kodu geçersiz"
        message={error ?? 'Bu kod kullanılamıyor. Menüden devam edebilirsin.'}
        surface="table-invalid"
      />
    );
  }

  return (
    <main
      className="ff-acct w-full pt-20 min-h-screen bg-background px-margin-sm"
      data-ff-surface="table"
    >
      <div className="ff-toolbar-eyebrow" style={{ marginTop: '2.5rem' }}>
        Masa bağlamı
      </div>
      <h1 className="ff-toolbar-title" style={{ fontSize: '24px', marginTop: '0.25rem' }}>
        {label}
      </h1>
      <p className="ff-lead">Menüye yönlendiriliyorsun.</p>
    </main>
  );
}
