'use client';

import { ApiError } from '@fastfood/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { clearCustomerSession, isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import {
  fetchMyOrders,
  patchCustomerProfile,
  type CustomerOrder,
} from '../../lib/storefront/account';
import { useSubmitLock } from '../../lib/storefront/account-hooks';
import { fetchLinkedIdentities } from '../../lib/storefront/auth';
import { clubProgress } from '../../lib/storefront/club-progress';
import { fetchClub, type ClubSnapshot } from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

/**
 * Account overview.
 *
 * This screen answers three questions and nothing more: who am I, what still
 * needs my attention, and what did I order last. Everything else belongs on its
 * own route. That is why there is no metric grid here — order count, points
 * and verification state are three rows in a ledger, not four hero tiles.
 */
export function AccountPage() {
  const router = useRouter();
  const { profile, refreshProfile, setDirty, toast } = useAccountUi();

  const [club, setClub] = useState<ClubSnapshot | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [verified, setVerified] = useState<{ email: boolean; phone: boolean }>({
    email: false,
    phone: false,
  });
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  /*
   * The form reads straight from the server profile until the first keystroke,
   * then from the draft. Seeding local state from an async value would need an
   * effect, and this repo's lint rules forbid setState-in-effect; deriving it
   * removes both the effect and the "stale copy of the profile" bug.
   */
  const [draft, setDraft] = useState<{ name: string; email: string } | null>(null);

  const ready = profile.status === 'ready' ? profile.profile : null;
  const savedName = ready?.displayName ?? '';
  const savedEmail = ready?.email ?? '';
  const name = draft?.name ?? savedName;
  const email = draft?.email ?? savedEmail;
  const dirty = draft !== null && (draft.name !== savedName || draft.email !== savedEmail);

  const redirectToAuth = useCallback(() => {
    clearCustomerSession();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    router.replace(`/auth?next=${next}`);
  }, [router]);

  const load = useCallback(async () => {
    try {
      // Club is a nice-to-have on this screen: a failure here must not take
      // the profile and order history down with it.
      const [nextOrders, identity, nextClub] = await Promise.all([
        fetchMyOrders(),
        fetchLinkedIdentities().catch(() => null),
        fetchClub().catch(() => null),
      ]);
      setOrders(nextOrders);
      setClub(nextClub);
      setVerified({
        email: identity?.emailVerified ?? false,
        phone: identity?.phoneVerified ?? false,
      });
      setLoadError(null);
      setPageState('ready');
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.envelope.error.code === 'AUTH_UNAUTHENTICATED')
      ) {
        redirectToAuth();
        return;
      }
      setLoadError(errorMessage(err));
      setPageState('error');
    }
  }, [redirectToAuth]);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, [load]);

  const save = useSubmitLock(
    useCallback(
      async (nextName: string, nextEmail: string) => {
        const updated = await patchCustomerProfile({
          displayName: nextName.trim() || undefined,
          email: nextEmail.trim() || undefined,
        });
        setDraft({ name: updated.displayName ?? '', email: updated.email ?? '' });
        setDirty(false);
        refreshProfile();
      },
      [setDirty, refreshProfile],
    ),
  );

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!dirty) return;
      try {
        await save.run(name, email);
        toast.ok('Profil kaydedildi.');
      } catch (err) {
        toast.error('Profil kaydedilemedi.', errorMessage(err));
      }
    },
    [dirty, email, name, save, toast],
  );

  if (profile.status === 'loading' || pageState === 'loading') {
    return <ShopSkeleton />;
  }
  if (profile.status === 'error' || !ready) {
    return (
      <ShopError
        title="Hesap"
        message={profile.status === 'error' ? profile.message : 'Profil yüklenemedi.'}
        onRetry={() => void load()}
      />
    );
  }
  if (pageState === 'error') {
    return (
      <ShopError
        title="Hesap"
        message={loadError ?? 'Sipariş geçmişi yüklenemedi.'}
        onRetry={() => void load()}
      />
    );
  }

  const displayName = ready.displayName?.trim() || 'BURGER HOME üyesi';
  const points = club?.points ?? null;
  const progress = club
    ? clubProgress({
        progressBps: club.progressBps,
        pointsToNextTier: club.pointsToNextTier,
        hasNextTier: club.nextTier !== null,
      })
    : null;

  return (
    <AccountShell
      surface="account"
      eyebrow="Hesap Merkezi"
      title="Hesap Özeti"
      description={`${displayName}, hoş geldin! Kişisel bilgilerini, siparişlerini ve ayrıcalıklarını buradan tek noktadan yönetebilirsin.`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/account/addresses" className="ff-btn ff-btn-outline">
            <MaterialIcon name="location_on" />
            Adresler
          </Link>
          <Link href="/orders" className="ff-btn ff-btn-primary">
            <MaterialIcon name="receipt_long" />
            Siparişlerim
          </Link>
        </div>
      }
    >
      {/* 1. Üst Metrik Kartları */}
      <div className="ff-stat-grid">
        <Link href="/account/club" className="ff-stat-card">
          <div className="ff-stat-icon">
            <MaterialIcon name="local_fire_department" />
          </div>
          <div className="ff-stat-content">
            <div className="ff-stat-label">Ateş Puanı</div>
            <div className="ff-stat-val">{points ?? '0'} <span className="text-xs font-normal text-on-surface-variant">puan</span></div>
            <div className="ff-stat-sub">{club?.currentTier.displayName ?? 'Kor'} Kademesi</div>
          </div>
        </Link>

        <Link href="/orders" className="ff-stat-card">
          <div className="ff-stat-icon">
            <MaterialIcon name="receipt_long" />
          </div>
          <div className="ff-stat-content">
            <div className="ff-stat-label">Toplam Sipariş</div>
            <div className="ff-stat-val">{orders.length} <span className="text-xs font-normal text-on-surface-variant">sipariş</span></div>
            <div className="ff-stat-sub">Geçmişi incele</div>
          </div>
        </Link>

        <Link href="/account/addresses" className="ff-stat-card">
          <div className="ff-stat-icon">
            <MaterialIcon name="location_on" />
          </div>
          <div className="ff-stat-content">
            <div className="ff-stat-label">Teslimat Adresleri</div>
            <div className="ff-stat-val">Adres Defteri</div>
            <div className="ff-stat-sub">Kayıtlı konumlar</div>
          </div>
        </Link>

        <Link href="/account/security" className="ff-stat-card">
          <div className="ff-stat-icon">
            <MaterialIcon name="shield" />
          </div>
          <div className="ff-stat-content">
            <div className="ff-stat-label">Güvenlik Durumu</div>
            <div className="ff-stat-val">
              {verified.email && verified.phone ? 'Tam Koruma' : 'Doğrulama'}
            </div>
            <div className="ff-stat-sub">
              {verified.email && verified.phone ? 'Hesap doğrulandı' : 'Güvenlik ayarları'}
            </div>
          </div>
        </Link>
      </div>

      {/* 2. Ana 2 Sütunlu Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sol / Geniş Sütun: Profil Formu */}
        <div className="lg:col-span-2">
          <form className="ff-card h-full" onSubmit={onSubmit} data-ff-profile-form>
            <div className="ff-card-header">
              <div>
                <h2 className="ff-card-title">
                  <MaterialIcon name="person" />
                  Kişisel Bilgiler & İletişim
                </h2>
                <p className="ff-card-desc">Ad ve e-posta adresin siparişlerinde ve faturalarında kullanılır.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="ff-field">
                  <span className="ff-field-label">Ad Soyad</span>
                  <input
                    className="ff-input"
                    value={name}
                    autoComplete="name"
                    placeholder="Adınız Soyadınız"
                    onChange={(event) => {
                      const next = event.target.value;
                      setDraft({ name: next, email });
                      setDirty(true);
                    }}
                  />
                </label>

                <label className="ff-field">
                  <span className="ff-field-label">E-posta Adresi</span>
                  <input
                    className="ff-input"
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder="ornek@alanadi.com"
                    onChange={(event) => {
                      const next = event.target.value;
                      setDraft({ name, email: next });
                      setDirty(true);
                    }}
                  />
                </label>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                    <MaterialIcon name="phone" />
                  </div>
                  <div>
                    <div className="text-xs text-on-surface-variant font-medium">Kayıtlı Telefon Numarası</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{ready.phone ?? 'Eklenmemiş'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <VerifyTag
                    verified={verified.phone ?? ready.phoneVerified === true}
                    present={Boolean(ready.phone)}
                  />
                  <Link href="/account/security" className="ff-btn ff-btn-outline ff-btn-sm">
                    Değiştir
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-on-surface-variant">
                  {dirty ? '• Kaydedilmemiş değişiklikler var' : 'Profil bilgileri güncel'}
                </span>
                <button
                  type="submit"
                  className="ff-btn ff-btn-primary"
                  disabled={save.pending || !dirty}
                  data-ff-profile-save
                >
                  <MaterialIcon name="save" />
                  {save.pending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Sağ Sütun: Burger Home Club Ayrıcalıkları */}
        <div className="lg:col-span-1">
          <div className="ff-card h-full flex flex-col justify-between">
            <div>
              <div className="ff-card-header">
                <div>
                  <h2 className="ff-card-title">
                    <MaterialIcon name="local_fire_department" />
                    Burger Home Club
                  </h2>
                  <p className="ff-card-desc">Özel ayrıcalıklar ve ödüller.</p>
                </div>
                <Link href="/account/club" className="ff-btn ff-btn-ghost ff-btn-sm" title="Kulüp Sayfası">
                  <MaterialIcon name="chevron_right" />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/15 via-surface-container-low to-primary/10 border border-secondary/20 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    {club?.currentTier.displayName ?? 'Kor'} Kademe
                  </span>
                  <span className="text-xl font-extrabold text-white">
                    {points ?? '0'} <span className="text-xs font-normal text-on-surface-variant">Puan</span>
                  </span>
                </div>

                <div className="mt-3">
                  {progress?.showRail ? (
                    <>
                      <div
                        className="ff-meter"
                        role="progressbar"
                        aria-valuenow={progress.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="ff-meter-fill" style={{ width: `${progress.percent}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-xs text-on-surface-variant mt-2">
                        <span>İlerleme: %{progress.percent}</span>
                        <span>{club?.nextTier?.displayName ?? 'Ateş'} kademesine {progress.pointsRemaining ?? 0} puan</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-on-surface-variant mt-2">En üst seviye ayrıcalıklara sahipsiniz.</p>
                  )}
                </div>
              </div>

              {/* Hızlı Erişim Butonları */}
              <div className="flex flex-col gap-2">
                <Link
                  href="/account/spin"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest/60 hover:bg-surface-container-high transition border border-outline-variant/60 text-sm font-medium text-white group"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-secondary">
                      <MaterialIcon name="stars" />
                    </span>
                    Ateş Çarkıfelek
                  </span>
                  <span className="text-xs text-secondary font-semibold group-hover:translate-x-0.5 transition-transform">
                    Çevir →
                  </span>
                </Link>

                <Link
                  href="/account/favorites"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest/60 hover:bg-surface-container-high transition border border-outline-variant/60 text-sm font-medium text-white group"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-primary">
                      <MaterialIcon name="favorite" />
                    </span>
                    Favori Ürünlerim
                  </span>
                  <MaterialIcon name="chevron_right" />
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/40 mt-4 text-xs text-on-surface-variant text-center">
              Sipariş verdikçe puan kazanıp yeni hediyelerin kilidini açarsın.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Son Siparişler Tablosu */}
      <RecentOrders orders={orders} />
    </AccountShell>
  );
}



function VerifyTag({ verified, present }: { verified: boolean; present: boolean }) {
  if (!present)
    return (
      <span className="ff-tag" data-tone="warn">
        Eksik
      </span>
    );
  if (!verified)
    return (
      <span className="ff-tag" data-tone="warn">
        Doğrulanmadı
      </span>
    );
  return (
    <span className="ff-tag" data-tone="ok">
      Doğrulandı
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent orders — a table, because these are records                          */
/* -------------------------------------------------------------------------- */

function RecentOrders({ orders }: { orders: CustomerOrder[] }) {
  const recent = orders.slice(0, 4);
  return (
    <section className="ff-section">
      <div className="ff-section-head">
        <h2 className="ff-section-title">Son siparişler</h2>
        <p className="ff-section-desc">
          {orders.length > 0 ? `${orders.length} sipariş kayıtlı.` : 'Henüz siparişin yok.'}
        </p>
      </div>
      <div className="ff-section-body">
        {recent.length === 0 ? (
          <div className="ff-empty">
            <MaterialIcon name="receipt_long" />
            <p className="ff-empty-title">Sipariş geçmişi boş</p>
            <p className="ff-empty-text">
              İlk siparişini verdiğinde burada sipariş numarası, durum ve tutar listelenir.
            </p>
            <Link href="/" className="ff-btn ff-btn-outline ff-btn-sm">
              Menüye git
            </Link>
          </div>
        ) : (
          <div className="ff-table-wrap">
            <div className="ff-table-scroll ff-scroll">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th scope="col">Sipariş</th>
                    <th scope="col">Tarih</th>
                    <th scope="col">Durum</th>
                    <th scope="col" className="num">
                      Tutar
                    </th>
                    <th scope="col" className="col-actions">
                      <span className="ff-sr-only">Aç</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/orders/${order.id}`} className="ff-row-label">
                          #{order.displayNumber ?? order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--color-on-surface-variant)' }}>
                        {order.createdAt ? formatDate(order.createdAt) : '—'}
                      </td>
                      <td>
                        <OrderTag status={order.status} label={order.statusLabel} />
                      </td>
                      <td className="num">
                        {order.finalPayableMinor
                          ? formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')
                          : '—'}
                      </td>
                      <td className="col-actions">
                        <Link
                          href={`/orders/${order.id}`}
                          className="ff-icon-btn"
                          aria-label={`Sipariş ${order.displayNumber ?? ''} detayını aç`}
                        >
                          <MaterialIcon name="chevron_right" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {recent.length > 0 ? (
          <div className="ff-cluster ff-cluster-end" style={{ marginTop: '0.625rem' }}>
            <Link href="/orders" className="ff-btn ff-btn-ghost ff-btn-sm">
              Tüm siparişler
              <MaterialIcon name="arrow_forward" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const ORDER_TONES: Record<string, 'ok' | 'warn' | 'danger' | 'info'> = {
  DELIVERED: 'ok',
  COMPLETED: 'ok',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  PREPARING: 'info',
  ACCEPTED: 'info',
  PENDING: 'warn',
};

function OrderTag({ status, label }: { status: string; label?: string }) {
  const tone = ORDER_TONES[status] ?? 'info';
  return (
    <span className="ff-tag" data-tone={tone}>
      {label ?? status}
    </span>
  );
}



/* -------------------------------------------------------------------------- */

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
