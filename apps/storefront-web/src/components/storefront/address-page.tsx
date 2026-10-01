'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { DEFAULT_DELIVERY_LOCATION, getDeliveryLocation } from '../../lib/delivery-location';
import { errorMessage } from '../../lib/load-state';
import { checkDeliveryServiceability } from '../../lib/storefront/serviceability';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { ShopError, ShopSkeleton } from './shop-states';

export function AddressServiceabilityPage() {
  const [lat, setLat] = useState(DEFAULT_DELIVERY_LOCATION.latitude);
  const [lng, setLng] = useState(DEFAULT_DELIVERY_LOCATION.longitude);
  const [label, setLabel] = useState(DEFAULT_DELIVERY_LOCATION.label);
  const [result, setResult] = useState<{ serviceable: boolean; branchId?: string } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const authed = isCustomerAuthenticated();

  useDeferredLoad(() => {
    const stored = getDeliveryLocation();
    setLat(stored.latitude);
    setLng(stored.longitude);
    setLabel(stored.label);
    void checkDeliveryServiceability(stored.latitude, stored.longitude, stored.label)
      .then((next) => {
        setResult({ serviceable: next.serviceable, branchId: next.branchId });
        setStatus('idle');
      })
      .catch((err: unknown) => {
        setError(errorMessage(err));
        setStatus('error');
      });
  }, []);

  async function check() {
    setStatus('loading');
    try {
      const next = await checkDeliveryServiceability(lat, lng, label);
      setResult({ serviceable: next.serviceable, branchId: next.branchId });
      setStatus('idle');
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  if (status === 'loading' && !result) return <ShopSkeleton />;
  if (status === 'error' && !result) {
    return <ShopError title="Teslimat bölgesi" message={error ?? 'Kontrol edilemedi.'} onRetry={() => void check()} />;
  }

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="address">
      <div className="max-w-xl mx-auto px-margin-sm lg:px-margin py-space-lg flex flex-col gap-space-md">
        <h1 className="font-headline-lg uppercase">Teslimat bölgesi</h1>
        <p className="font-body-md text-on-surface-variant">
          Adres kaydı checkout ve hesap adreslerinde yapılır. Bu sayfa yalnızca mevcut konumun servis
          alanına düşüp düşmediğini kontrol eder.
        </p>
        <label className="font-label-sm uppercase">
          Etiket
          <input
            className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 font-body-md"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-space-sm">
          <label className="font-label-sm uppercase">
            Enlem
            <input
              className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 font-body-md"
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
            />
          </label>
          <label className="font-label-sm uppercase">
            Boylam
            <input
              className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 font-body-md"
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          className="px-space-lg py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
          onClick={() => void check()}
        >
          Bölgeyi kontrol et
        </button>
        {result ? (
          <p className="font-body-md" data-ff-serviceable={result.serviceable ? 'yes' : 'no'}>
            {result.serviceable ? 'Bu konum teslimat alanındadır.' : 'Bu konum şu an servis dışıdır.'}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-space-sm">
          <Link href="/checkout" className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md uppercase">
            Checkout
          </Link>
          {authed ? (
            <Link href="/account/addresses" className="px-space-md py-2 rounded-lg bg-surface-container-high font-label-md uppercase">
              Kayıtlı adresler
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
