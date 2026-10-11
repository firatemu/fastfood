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
      eyebrow="Ayrıcalıklar"
      title={LOYALTY_PROGRAM_NAME}
      description="Siparişlerden, Ateş Çarkı'ndan ve kampanyalardan biriken puanların."
      actions={
        <Link href="/account/spin" className="ff-btn ff-btn-primary">
          <MaterialIcon name="casino" />
          Ateş Çarkı
        </Link>
      }
    >
      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Bakiye</h2>
          <p className="ff-section-desc">
            Seviye, harcanabilir puandan ayrı olarak ömür boyu kazanca bakılır.
          </p>
        </div>
        <div className="ff-section-body">
          <div className="ff-rows">
            <div className="ff-row" style={{ minHeight: '5.5rem' }}>
              <div className="ff-row-key">
                <div className="ff-row-label">Ateş puanı</div>
                <div className="ff-figure" style={{ fontSize: '2.75rem', marginTop: '0.25rem' }} data-ff-club-points>
                  {club.points}
                </div>
              </div>
              <div className="ff-row-key" style={{ flex: '1 1 15rem', maxWidth: '24rem' }}>
                <div className="ff-kv">
                  <span className="ff-kv-key">Seviye</span>
                  <span className="ff-kv-value" data-ff-club-tier>
                    {club.currentTier.displayName}
                  </span>
                </div>
                <div className="ff-kv" style={{ marginTop: '0.25rem' }}>
                  <span className="ff-kv-key">Ömür boyu kazanç</span>
                  <span className="ff-kv-value">{club.lifetimeEarnedPoints} puan</span>
                </div>
              </div>
              <div className="ff-row-key" style={{ flex: '1 1 15rem', maxWidth: '24rem' }}>
                {progress.showRail ? (
                  <>
                    <div
                      className="ff-meter"
                      role="progressbar"
                      aria-valuenow={progress.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${club.nextTier?.displayName ?? ''} seviyesine ilerleme`}
                    >
                      <div className="ff-meter-fill" style={{ width: `${progress.percent}%` }} data-ff-club-progress />
                    </div>
                    <p className="ff-row-hint" style={{ marginTop: '0.5rem' }}>
                      {club.nextTier?.displayName} seviyesine {progress.pointsRemaining} puan kaldı
                    </p>
                  </>
                ) : (
                  <p className="ff-row-hint">En üst seviyesin.</p>
                )}
              </div>
            </div>
          </div>

          {club.welcome.status === 'AVAILABLE' ? (
            <div className="ff-notice" data-tone="info" data-ff-welcome style={{ marginTop: '0.75rem' }}>
              <MaterialIcon name="card_giftcard" />
              <span>
                Hoş geldin indirimi checkout&apos;ta uygulanır
                {club.welcome.promotionCode ? ` · ${club.welcome.promotionCode}` : ''}.
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Hareketler</h2>
          <p className="ff-section-desc">Puanının giriş ve çıkışları.</p>
        </div>
        <div className="ff-section-body">
          {club.activity.length === 0 ? (
            <div className="ff-empty">
              <MaterialIcon name="history" />
              <p className="ff-empty-title">Henüz hareket yok</p>
              <p className="ff-empty-text">
                İlk siparişinin puanı buraya yansır. Puanlar sipariş tamamlandığında işlenir.
              </p>
            </div>
          ) : (
            <div className="ff-table-wrap">
              <div className="ff-table-scroll ff-scroll">
                <table className="ff-table">
                  <thead>
                    <tr>
                      <th scope="col">Hareket</th>
                      <th scope="col" className="num">
                        Puan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {club.activity.map((row) => {
                      const delta = Number(row.pointsDelta);
                      const positive = delta > 0;
                      return (
                        <tr key={row.id}>
                          <td>{activityLabel(row.reason, row.entryType)}</td>
                          <td className="num">
                            <span
                              style={{ color: positive ? 'var(--color-ok)' : 'var(--color-on-surface-variant)' }}
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