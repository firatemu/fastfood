'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import { scanDiningTable, writeDiningContext } from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { ShopError, ShopSkeleton } from './shop-states';

export function TableLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="table-lookup">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 min-w-0">
            <h1 className="font-headline-md uppercase">Masa Kodu</h1>
            <p className="font-body-sm text-on-surface-variant mt-2">
              QR’daki kodu gir. Bu bir giriş işlemi değildir; yalnızca şube ve masa bağlamı kurulur.
            </p>
            <form
              className="mt-space-md flex flex-col sm:flex-row gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(`/table/${encodeURIComponent(code.trim())}`);
              }}
            >
              <input
                className="flex-1 h-12 px-4 rounded-lg bg-surface-container-low"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Masa kodu"
                data-ff-table-code
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className="h-12 px-space-lg rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
              >
                Aç
              </button>
            </form>
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}

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
      <main className="w-full pt-20 min-h-screen bg-background px-margin-sm" data-ff-surface="table">
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
    <main className="w-full pt-20 min-h-screen bg-background px-margin-sm" data-ff-surface="table">
      <h1 className="font-headline-md uppercase mt-space-lg">{label}</h1>
      <p className="font-body-md text-on-surface-variant mt-2">Menüye yönlendiriliyorsun.</p>
    </main>
  );
}
