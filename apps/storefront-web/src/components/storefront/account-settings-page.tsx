'use client';

import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { fetchCustomerPreferences, patchCustomerPreferences, type CustomerPreference } from '../../lib/storefront/account';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { ShopError, ShopSkeleton } from './shop-states';

export function AccountSettingsPage() {
  const [prefs, setPrefs] = useState<CustomerPreference | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      setPrefs(await fetchCustomerPreferences());
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, []);

  async function save(next: CustomerPreference) {
    setSaved(false);
    try {
      setPrefs(await patchCustomerPreferences(next));
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error' || !prefs) {
    return <ShopError title="Ayarlar" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="account-settings">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <form className="lg:col-span-9 rounded-xl bg-surface-container p-space-md flex flex-col gap-4">
            <h1 className="font-headline-md uppercase">Hesap ayarları</h1>
            <p className="font-body-sm text-on-surface-variant">
              Bu tercihler hesaba yazılır ve cihazlar arasında taşınır. Sepet/UI durumu tarayıcıda kalır.
            </p>
            <label className="flex items-center justify-between gap-3">
              <span>Sipariş bildirimleri</span>
              <input
                type="checkbox"
                checked={prefs.orderUpdatesOptIn}
                onChange={(e) => void save({ ...prefs, orderUpdatesOptIn: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Pazarlama iletişimi</span>
              <input
                type="checkbox"
                checked={prefs.marketingOptIn}
                onChange={(e) => void save({ ...prefs, marketingOptIn: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Ember Kulübü e-postası</span>
              <input
                type="checkbox"
                data-ff-newsletter
                checked={prefs.newsletterOptIn}
                onChange={(e) => void save({ ...prefs, newsletterOptIn: e.target.checked })}
              />
            </label>
            {saved ? <p className="font-body-sm text-secondary">Ayarlar kaydedildi.</p> : null}
            {error ? <p className="font-body-sm text-error">{error}</p> : null}
          </form>
        </div>
      </div>
    </RequireCustomer>
  );
}
