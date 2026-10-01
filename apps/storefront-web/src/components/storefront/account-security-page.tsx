'use client';

import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import {
  changeCustomerPassword,
  createCustomerPassword,
  fetchLinkedIdentities,
  requestEmailVerification,
} from '../../lib/storefront/auth';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { ShopError, ShopSkeleton } from './shop-states';

export function AccountSecurityPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [identities, setIdentities] = useState<Array<{ provider: string; emailNormalized: string | null }>>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');

  async function load() {
    try {
      const data = await fetchLinkedIdentities();
      setHasPassword(data.hasPassword);
      setPhoneVerified(data.phoneVerified);
      setEmailVerified(data.emailVerified);
      setIdentities(data.identities);
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

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    try {
      if (hasPassword) {
        await changeCustomerPassword(currentPassword, nextPassword);
      } else {
        await createCustomerPassword(nextPassword);
      }
      setInfo('Şifre güncellendi.');
      setCurrentPassword('');
      setNextPassword('');
      await load();
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
  if (status === 'error') {
    return <ShopError title="Güvenlik" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="account-security">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 flex flex-col gap-space-md">
            <h1 className="font-headline-md uppercase">Güvenlik</h1>
            <ul className="rounded-xl bg-surface-container p-space-md font-body-md flex flex-col gap-2">
              <li>Telefon OTP: {phoneVerified ? 'doğrulandı' : 'yok'}</li>
              <li>E-posta: {emailVerified ? 'doğrulandı' : 'doğrulanmadı'}</li>
              <li>Şifre: {hasPassword ? 'tanımlı' : 'tanımsız'}</li>
              {identities.map((identity) => (
                <li key={`${identity.provider}-${identity.emailNormalized ?? 'none'}`}>
                  {identity.provider}
                  {identity.emailNormalized ? ` · ${identity.emailNormalized}` : ''}
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => void submitPassword(e)} className="rounded-xl bg-surface-container p-space-md flex flex-col gap-3">
              <h2 className="font-headline-sm uppercase">{hasPassword ? 'Şifre değiştir' : 'Şifre oluştur'}</h2>
              {hasPassword ? (
                <input className="h-12 px-4 rounded-lg bg-surface-container-low" type="password" placeholder="Mevcut şifre" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              ) : null}
              <input className="h-12 px-4 rounded-lg bg-surface-container-low" type="password" minLength={10} placeholder="Yeni şifre (min 10)" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} required />
              <button type="submit" className="h-12 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase">
                Kaydet
              </button>
            </form>
            <button
              type="button"
              className="h-12 rounded-lg bg-surface-container-high font-label-md uppercase"
              onClick={() => void requestEmailVerification().then(() => setInfo('Doğrulama isteği alındı.')).catch((err) => setError(errorMessage(err)))}
            >
              E-posta doğrulama iste
            </button>
            {info ? <p className="text-secondary font-body-sm">{info}</p> : null}
            {error ? <p className="text-error font-body-sm">{error}</p> : null}
            <p className="font-body-sm text-on-surface-variant">Cihaz listesi yok — uydurma oturum envanteri gösterilmez.</p>
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
