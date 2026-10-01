'use client';

import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import {
  fetchSpin,
  playSpin,
  type SpinEligibility,
  type SpinPlay,
} from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { ShopError, ShopSkeleton } from './shop-states';

export function SpinPage() {
  const [state, setState] = useState<SpinEligibility | null>(null);
  const [result, setResult] = useState<SpinPlay | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const next = await fetchSpin();
      setState(next);
      if (next.lastPlay && typeof next.lastPlay === 'object') {
        setResult(next.lastPlay as SpinPlay);
      }
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

  async function spin() {
    if (busy || spinning) return;
    setBusy(true);
    setError(null);
    try {
      const key = `spin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const play = await playSpin(key);
      setSpinning(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setResult(play);
      setState((prev) =>
        prev
          ? { ...prev, eligible: false, reason: 'ALREADY_USED', spinsRemaining: 0, lastPlay: play }
          : prev,
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSpinning(false);
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error' || !state) {
    return (
      <RequireCustomer>
        <ShopError title="Ateş Çarkı" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
      </RequireCustomer>
    );
  }

  const reasonCopy =
    state.reason === 'NO_CAMPAIGN'
      ? 'Aktif çark kampanyası yok.'
      : state.reason === 'ALREADY_USED'
        ? 'Bugünkü hakkın kullanıldı.'
        : state.reason === 'NO_PRIZES'
          ? 'Kampanya ödülü tanımlı değil.'
          : '1 hak hazır.';

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="spin">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 min-w-0">
            <section className="rounded-xl bg-gradient-to-br from-surface-container via-surface-container-low to-surface-container-lowest p-space-md lg:p-space-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <h1 className="font-headline-md uppercase">Ateş Çarkı</h1>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm uppercase">
                  {reasonCopy}
                </span>
              </div>
              <p className="font-body-sm text-on-surface-variant mt-2">
                Sonuç sunucuda belirlenir. Animasyon yalnızca kazandığın ödülü gösterir.
              </p>
              <div
                className={`mt-space-lg mx-auto w-48 h-48 rounded-full border-4 border-primary-container flex items-center justify-center ${spinning ? 'animate-spin' : ''}`}
                data-ff-spin-wheel
                data-ff-spin-state={spinning ? 'spinning' : result ? 'result' : state.eligible ? 'ready' : 'blocked'}
              >
                <span className="font-headline-sm uppercase text-center px-4">
                  {spinning ? 'Çevriliyor' : result ? result.prize.label : 'Çark'}
                </span>
              </div>
              <button
                type="button"
                className="mt-space-lg w-full h-12 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase disabled:opacity-50"
                disabled={!state.eligible || busy}
                onClick={() => void spin()}
                data-ff-spin
              >
                Çarkı Çevir
              </button>
              {result ? (
                <div className="mt-space-md rounded-xl bg-surface-container p-space-md" data-ff-spin-result>
                  <p className="font-headline-sm">{result.prize.label}</p>
                  {result.prize.couponCode ? (
                    <p className="font-body-sm mt-1">Kupon: {result.prize.couponCode}</p>
                  ) : null}
                  {BigInt(result.prize.pointsAwarded) > 0n ? (
                    <p className="font-body-sm mt-1">Puan: {result.prize.pointsAwarded}</p>
                  ) : null}
                </div>
              ) : null}
              {error ? <p className="font-body-sm text-error mt-3">{error}</p> : null}
            </section>
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
