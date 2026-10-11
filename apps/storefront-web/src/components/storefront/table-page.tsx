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
    <div className="ff-acct min-h-screen w-full bg-background pt-20" data-ff-surface="table-lookup">
      <main className="mx-auto flex w-full max-w-xl flex-col justify-center px-margin-sm py-space-xl">
        <span className="ff-toolbar-eyebrow">Masa bağlamı</span>
        <h1 className="ff-toolbar-title" style={{ fontSize: '24px', marginTop: '0.25rem' }}>
          Masa Kodu
        </h1>
        <p className="ff-lead">
          Masandaki QR etiketindeki kodu gir. Bu bir giriş işlemi değildir; yalnızca şube ve masa
          bağlamını kurar, sepetini etkilemez.
        </p>

        <form
          className="ff-cluster"
          style={{ marginTop: '0.5rem', flexWrap: 'nowrap', alignItems: 'flex-end' }}
          onSubmit={(event) => {
            event.preventDefault();
            router.push(`/table/${encodeURIComponent(code.trim())}`);
          }}
        >
          <label className="ff-field" style={{ flex: 1 }}>
            <span className="ff-field-label">Masa kodu</span>
            <input
              className="ff-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ör. A12"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              data-ff-table-code
            />
          </label>
          <button type="submit" className="ff-btn ff-btn-primary" disabled={!code.trim()}>
            Kodu aç
          </button>
        </form>

        <div className="ff-notice" data-tone="info" style={{ marginTop: '1.25rem' }}>
          <MaterialIcon name="info" />
          <span>Kodu bilmiyorsan masadan yardım iste.</span>
        </div>

        <p className="ff-row-hint" style={{ marginTop: '0.75rem' }}>
          Kod olmadan da{' '}
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              color: 'var(--color-secondary-container)',
              font: 'inherit',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              cursor: 'pointer',
            }}
          >
            menüden devam edebilirsin
          </button>
          .
        </p>
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
      <main className="ff-acct w-full pt-20 min-h-screen bg-background px-margin-sm" data-ff-surface="table">
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
    <main className="ff-acct w-full pt-20 min-h-screen bg-background px-margin-sm" data-ff-surface="table">
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