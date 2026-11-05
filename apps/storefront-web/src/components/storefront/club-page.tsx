'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import { clubProgress } from '../../lib/storefront/club-progress';
import { fetchClub, type ClubSnapshot } from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
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

/**
 * BURGER HOME CLUB.
 *
 * The points balance is the one number this page exists to show, so it takes
 * the screen's single allowed display figure. Everything after it is a ledger:
 * the tier facts, then the movement history as a table with a signed delta
 * column. Progress comes from `clubProgress`, which clamps the backend basis
 * points, so the rail cannot overflow its track.
 */
export function ClubPage() {
  const [club, setClub] = useState<ClubSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClub(await fetchClub());
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }, []);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, [load]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error' || !club) {
    return (
      <ShopError
        title={LOYALTY_PROGRAM_NAME}
        message={error ?? 'Yüklenemedi.'}
        onRetry={() => void load()}
      />
    );
  }

  const progress = clubProgress({
    progressBps: club.progressBps,
    pointsToNextTier: club.pointsToNextTier,
    hasNextTier: Boolean(club.nextTier),
  });

  return (
    <AccountShell
      surface="club"
      eyebrow="Ayrıcalıklar & Sadakat"
      title={LOYALTY_PROGRAM_NAME}
      description="Siparişlerinden, Ateş Çarkı'ndan ve kampanyalardan biriken puanların ve kazandığın özel ayrıcalıklar."
      actions={
        <Link href="/account/spin" className="ff-btn ff-btn-primary">
          <MaterialIcon name="casino" />
          Ateş Çarkı'nı Çevir
        </Link>
      }
    >
      {/* VIP Üyelik Kartı */}
      <div className="ff-card mb-6 bg-gradient-to-br from-surface-container-high via-surface-container-low to-secondary/10 border border-secondary/25 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-outline-variant/60">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-black shadow-lg shadow-secondary/20">
              <MaterialIcon name="local_fire_department" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary px-2.5 py-0.5 rounded-full bg-secondary/15 border border-secondary/30" data-ff-club-tier>
                  {club.currentTier.displayName} Üye
                </span>
                <span className="text-xs text-on-surface-variant font-medium">Ömür Boyu: {club.lifetimeEarnedPoints} puan</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white mt-1.5 flex items-baseline gap-2">
                <span data-ff-club-points>{club.points}</span>
                <span className="text-base font-medium text-secondary">Ateş Puanı</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/account/spin" className="ff-btn ff-btn-primary">
              <MaterialIcon name="stars" />
              Çarkıfelek
            </Link>
            <Link href="/" className="ff-btn ff-btn-outline">
              Puan Kazan
            </Link>
          </div>
        </div>

        {/* İlerleme Çubuğu */}
        <div className="pt-5">
          {progress.showRail ? (
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-white">Sonraki Kademe İlerlemesi</span>
                <span className="text-secondary">
                  {club.nextTier?.displayName} seviyesine {progress.pointsRemaining} puan kaldı
                </span>
              </div>
              <div
                className="ff-meter h-2.5 rounded-full bg-surface-container-highest"
                role="progressbar"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${club.nextTier?.displayName ?? ''} seviyesine ilerleme`}
              >
                <div
                  className="ff-meter-fill h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                  data-ff-club-progress
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-secondary font-medium">
              Tebrikler! En yüksek üyelik kademesine ulaştınız.
            </div>
          )}
        </div>

        {club.welcome.status === 'AVAILABLE' ? (
          <div
            className="mt-5 p-3.5 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center gap-3 text-sm text-white"
            data-ff-welcome
          >
            <span className="text-secondary text-xl">
              <MaterialIcon name="card_giftcard" />
            </span>
            <div className="flex-1">
              <span className="font-semibold text-secondary">Hoş Geldin Ödülü Aktif: </span>
              Checkout adımında indirim otomatik uygulanır
              {club.welcome.promotionCode ? ` (${club.welcome.promotionCode})` : ''}.
            </div>
          </div>
        ) : null}
      </div>

      {/* Kademe Avantajları Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="ff-card p-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center mb-3">
            <MaterialIcon name="percent" />
          </div>
          <h3 className="text-sm font-bold text-white">Siparişlerde % Puan</h3>
          <p className="text-xs text-on-surface-variant mt-1">Her siparişte harcadığın tutarın bir kısmı hesabına puan olarak döner.</p>
        </div>

        <div className="ff-card p-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
            <MaterialIcon name="casino" />
          </div>
          <h3 className="text-sm font-bold text-white">Günlük Ateş Çarkı</h3>
          <p className="text-xs text-on-surface-variant mt-1">Her gün ücretsiz çark hakkıyla sürpriz burgerler ve indirimler kazan.</p>
        </div>

        <div className="ff-card p-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center mb-3">
            <MaterialIcon name="cake" />
          </div>
          <h3 className="text-sm font-bold text-white">Doğum Günü İkramı</h3>
          <p className="text-xs text-on-surface-variant mt-1">Özel gününde Burger Home ailesinden gurme lezzet ikramı.</p>
        </div>

        <div className="ff-card p-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
            <MaterialIcon name="delivery_dining" />
          </div>
          <h3 className="text-sm font-bold text-white">Öncelikli Teslimat</h3>
          <p className="text-xs text-on-surface-variant mt-1">Siparişlerin mutfakta ve kuryede öncelikli olarak hazırlanır.</p>
        </div>
      </div>

      {/* Puan Hareketleri Geçmişi */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div>
            <h2 className="ff-card-title">
              <MaterialIcon name="history" />
              Puan Hareketleri
            </h2>
            <p className="ff-card-desc">Kazanılan ve harcanan puanların dökümü.</p>
          </div>
        </div>

        <div>
          {club.activity.length === 0 ? (
            <div className="ff-empty">
              <MaterialIcon name="history" />
              <p className="ff-empty-title">Henüz puan hareketi yok</p>
              <p className="ff-empty-text">
                İlk siparişini verdiğinde veya Ateş Çarkı çevirdiğinde kazandığın puanlar buraya yansır.
              </p>
            </div>
          ) : (
            <div className="ff-table-wrap">
              <div className="ff-table-scroll ff-scroll">
                <table className="ff-table">
                  <thead>
                    <tr>
                      <th scope="col">Hareket Türü</th>
                      <th scope="col" className="num">Puan Değişimi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {club.activity.map((row) => {
                      const delta = Number(row.pointsDelta);
                      const positive = delta > 0;
                      return (
                        <tr key={row.id}>
                          <td className="font-medium text-white">{activityLabel(row.reason, row.entryType)}</td>
                          <td className="num font-bold">
                            <span
                              style={{
                                color: positive
                                  ? 'var(--color-ok)'
                                  : 'var(--color-on-surface-variant)',
                              }}
                            >
                              {positive ? '+' : ''}
                              {row.pointsDelta}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </AccountShell>
  );
}
