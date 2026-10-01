'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import { fetchClub, type ClubSnapshot } from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

function activityLabel(reason: string | null, type: string): string {
  if (reason === 'welcome_reward') return 'Hoş geldin ödülü';
  if (reason === 'spin_reward') return 'Ateş Çarkı';
  if (reason === 'order_earn') return 'Sipariş puanı';
  if (reason === 'redeemed') return 'Checkout kullanımı';
  if (reason === 'released') return 'Puan iadesi';
  if (type === 'EARNED') return 'Puan kazancı';
  if (type === 'REDEEMED') return 'Puan kullanımı';
  return 'Hareket';
}

export function ClubPage() {
  const [club, setClub] = useState<ClubSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setClub(await fetchClub());
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

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error' || !club) {
    return (
      <RequireCustomer>
        <ShopError title={LOYALTY_PROGRAM_NAME} message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
      </RequireCustomer>
    );
  }

  const progressPct = Math.round(club.progressBps / 100);

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="club">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 min-w-0 flex flex-col gap-space-lg">
            <section className="rounded-xl bg-surface-container-low p-space-md lg:p-space-lg">
              <p className="font-label-sm uppercase text-primary-container">{LOYALTY_PROGRAM_NAME}</p>
              <h1 className="font-headline-md uppercase mt-1">{club.currentTier.displayName} üye</h1>
              <div className="grid grid-cols-2 gap-space-sm mt-space-md">
                <div>
                  <p className="font-headline-sm text-primary-container" data-ff-club-points>
                    {club.points}
                  </p>
                  <p className="font-label-sm uppercase text-on-surface-variant">Ateş puanı</p>
                </div>
                <div>
                  <p className="font-headline-sm" data-ff-club-tier>
                    {club.currentTier.displayName}
                  </p>
                  <p className="font-label-sm uppercase text-on-surface-variant">Seviye</p>
                </div>
              </div>
              {club.nextTier ? (
                <div className="mt-space-md">
                  <div className="flex justify-between font-label-sm uppercase text-on-surface-variant">
                    <span>Sonraki: {club.nextTier.displayName}</span>
                    <span>{club.pointsToNextTier} puan</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className="h-full bg-primary-container"
                      style={{ width: `${progressPct}%` }}
                      data-ff-club-progress
                    />
                  </div>
                </div>
              ) : (
                <p className="font-body-sm text-secondary mt-space-md">En üst seviye.</p>
              )}
              {club.welcome.status === 'AVAILABLE' ? (
                <p className="font-body-sm text-secondary mt-space-md" data-ff-welcome>
                  Hoş geldin indirimi checkout’ta uygulanır
                  {club.welcome.promotionCode ? ` · ${club.welcome.promotionCode}` : ''}.
                </p>
              ) : null}
              <Link
                href="/account/spin"
                className="mt-space-md inline-flex h-12 px-space-lg items-center rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
              >
                Ateş Çarkı
              </Link>
            </section>
            <section className="rounded-xl bg-surface-container p-space-md">
              <h2 className="font-headline-sm uppercase">Hareketler</h2>
              {club.activity.length === 0 ? (
                <p className="font-body-md text-on-surface-variant mt-3">Henüz hareket yok.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {club.activity.map((row) => (
                    <li key={row.id} className="flex justify-between gap-3 py-2 border-b border-outline-variant/30">
                      <span className="font-body-sm">{activityLabel(row.reason, row.entryType)}</span>
                      <span className="font-label-md">{row.pointsDelta}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <p className="font-body-sm text-on-surface-variant flex items-center gap-2">
              <MaterialIcon name="info" />
              Seviye, harcanabilir puandan ayrı olarak ömür boyu kazanca bakılır.
            </p>
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
