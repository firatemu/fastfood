'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { ApiError } from '@fastfood/api-client';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import {
  fetchCustomerProfile,
  fetchLoyaltyPoints,
  fetchMyOrders,
  patchCustomerProfile,
  type CustomerOrder,
  type CustomerProfile,
} from '../../lib/storefront/account';
import { clearCustomerSession } from '../../lib/api';
import { fetchLinkedIdentities } from '../../lib/storefront/auth';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import { fetchClub, type ClubSnapshot } from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

export function RequireCustomer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) {
      const next = params.get('next') || window.location.pathname;
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
      return;
    }
    setReady(true);
  }, [params, router]);
  if (!ready) return <ShopSkeleton />;
  return children;
}

export function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [points, setPoints] = useState<string | null>(null);
  const [club, setClub] = useState<ClubSnapshot | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  async function load() {
    try {
      const [nextProfile, nextPoints, nextOrders, identity, nextClub] = await Promise.all([
        fetchCustomerProfile(),
        fetchLoyaltyPoints().catch(() => null),
        fetchMyOrders().catch(() => []),
        fetchLinkedIdentities().catch(() => null),
        fetchClub().catch(() => null),
      ]);
      setProfile(nextProfile);
      setName(nextProfile.displayName ?? '');
      setEmail(nextProfile.email ?? '');
      setPoints(nextPoints);
      setClub(nextClub);
      setOrders(nextOrders);
      setEmailVerified(identity?.emailVerified ?? nextProfile.emailVerified === true);
      setPhoneVerified(identity?.phoneVerified ?? nextProfile.phoneVerified === true);
      setStatus('ready');
    } catch (err) {
      // Oturum süresi dolmuşsa kullanıcıyı girişe yönlendir.
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.envelope.error.code === 'AUTH_UNAUTHENTICATED')
      ) {
        clearCustomerSession();
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`/auth?next=${next}`);
        return;
      }
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const next = await patchCustomerProfile({
        displayName: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      setProfile(next);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error' || !profile) {
    return (
      <RequireCustomer>
        <ShopError
          title="Hesap"
          message={error ?? 'Profil yüklenemedi.'}
          onRetry={() => void load()}
        />
      </RequireCustomer>
    );
  }

  const orderCount = orders.length;
  const recent = orders.slice(0, 3);

  return (
    <RequireCustomer>
      <div className="min-h-screen w-full bg-background pt-20" data-ff-surface="account">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-space-lg px-margin-sm py-space-lg lg:px-margin lg:py-space-xl">
          <header className="flex flex-col gap-space-md border-b border-outline-variant/40 pb-space-lg sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Hesabın</h1>
              <p className="mt-1 max-w-2xl font-body-md text-on-surface-variant">
                Merhaba {profile.displayName?.trim() || 'BURGER HOME üyesi'}. Profilini ve
                siparişlerini buradan yönet.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-secondary-container px-space-lg font-label-md text-on-secondary-container transition-colors hover:bg-secondary-container/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container"
            >
              <MaterialIcon name="restaurant_menu" />
              Menüyü keşfet
            </Link>
          </header>

          <div className="grid items-start gap-space-lg lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="flex min-w-0 flex-col gap-space-md lg:sticky lg:top-24">
              <section className="rounded-xl border border-outline-variant/35 bg-surface-container p-space-md">
                <div className="flex min-w-0 items-center gap-space-md">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-secondary-container text-xl font-headline-sm text-on-secondary-container">
                    {profile.displayName?.trim().charAt(0).toLocaleUpperCase('tr-TR') || 'B'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-label-lg text-on-surface">
                      {profile.displayName?.trim() || 'BURGER HOME üyesi'}
                    </p>
                    <p className="mt-1 truncate font-body-sm text-on-surface-variant">
                      {profile.email || profile.phone || 'İletişim bilgisi ekle'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/account/club"
                  className="mt-space-md flex items-center justify-between gap-3 rounded-lg bg-surface-container-lowest px-space-md py-3 transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container"
                >
                  <span className="min-w-0">
                    <span className="block font-label-sm text-on-surface-variant">
                      {LOYALTY_PROGRAM_NAME}
                    </span>
                    <span className="mt-1 block truncate font-label-md text-secondary">
                      {club?.currentTier.displayName || 'Üyelik bilgilerin'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-headline-sm tabular-nums text-secondary">
                      {points ?? '—'}
                    </span>
                    <span className="block font-label-sm text-on-surface-variant">puan</span>
                  </span>
                </Link>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline-variant/35 pt-3">
                  <div>
                    <p className="font-headline-sm text-headline-sm tabular-nums text-on-surface">
                      {orderCount}
                    </p>
                    <p className="font-body-sm text-on-surface-variant">Sipariş</p>
                  </div>
                  <div className="text-right">
                    <p className="font-label-md text-on-surface">
                      {emailVerified ? 'Doğrulandı' : profile.email ? 'Doğrulanmadı' : 'Eklenmemiş'}
                    </p>
                    <p className="font-body-sm text-on-surface-variant">E-posta</p>
                  </div>
                </div>
              </section>

              <div className="rounded-xl border border-outline-variant/25 bg-surface-container-low p-space-sm">
                <AccountNav />
              </div>
            </aside>

            <div className="grid min-w-0 gap-space-md xl:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)]">
              <form
                onSubmit={(event) => void save(event)}
                className="flex min-w-0 flex-col gap-space-md rounded-xl border border-outline-variant/35 bg-surface-container p-space-md lg:p-space-lg"
                data-ff-profile-form
              >
                <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 pb-space-md">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Kişisel bilgiler
                    </h2>
                    <p className="mt-1 font-body-sm text-on-surface-variant">
                      Hesap iletişim bilgilerini güncel tut.
                    </p>
                  </div>
                  <MaterialIcon name="manage_accounts" className="text-2xl text-secondary" />
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-on-surface-variant">Adın</span>
                  <input
                    className="h-12 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-secondary-container focus-visible:ring-2 focus-visible:ring-secondary-container/30"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-on-surface-variant">E-posta</span>
                  <input
                    className="h-12 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-secondary-container focus-visible:ring-2 focus-visible:ring-secondary-container/30"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <div className="rounded-lg bg-surface-container-lowest px-space-md py-3">
                  <p className="font-label-sm text-on-surface-variant">Telefon</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-body-md text-on-surface">
                      {profile.phone || 'Telefon eklenmemiş'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-label-sm text-on-surface-variant">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${phoneVerified ? 'bg-secondary-container' : 'bg-outline'}`}
                      />
                      {phoneVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
                    </span>
                  </div>
                </div>
                {error ? (
                  <p className="font-body-sm text-error" role="alert">
                    {error}
                  </p>
                ) : null}
                {saved ? (
                  <p className="font-body-sm text-secondary" role="status">
                    Profil kaydedildi.
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary-container px-space-lg font-label-md text-on-secondary-container transition-colors hover:bg-secondary-container/90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container"
                  data-ff-profile-save
                >
                  {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
                </button>
              </form>

              <section className="flex min-w-0 flex-col rounded-xl border border-outline-variant/35 bg-surface-container p-space-md lg:p-space-lg">
                <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 pb-space-md">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Son siparişler
                    </h2>
                    <p className="mt-1 font-body-sm text-on-surface-variant">
                      {orderCount
                        ? `${orderCount} sipariş hesabında kayıtlı`
                        : 'Sipariş geçmişin burada görünür'}
                    </p>
                  </div>
                  <Link
                    href="/orders"
                    className="shrink-0 rounded-md px-2 py-1 font-label-sm text-secondary hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container"
                  >
                    Tümünü gör
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <div className="flex flex-1 flex-col items-start justify-center gap-3 py-space-xl">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-container-high text-secondary">
                      <MaterialIcon name="receipt_long" className="text-xl" />
                    </span>
                    <div>
                      <p className="font-label-md text-on-surface">Henüz sipariş yok</p>
                      <p className="mt-1 max-w-xs font-body-sm text-on-surface-variant">
                        İlk burgerini seçtiğinde siparişini buradan takip edebilirsin.
                      </p>
                    </div>
                    <Link
                      href="/"
                      className="font-label-sm text-secondary underline-offset-4 hover:underline"
                    >
                      Menüye git
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-outline-variant/25">
                    {recent.map((order) => (
                      <li key={order.id}>
                        <Link
                          href={`/orders/${order.id}`}
                          className="flex min-h-16 items-center justify-between gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-label-md text-on-surface">
                              #{order.displayNumber ?? order.id.slice(0, 8)}
                            </span>
                            <span className="mt-1 block truncate font-body-sm text-on-surface-variant">
                              {order.statusLabel ?? order.status}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-label-md tabular-nums text-on-surface">
                              {order.finalPayableMinor
                                ? formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')
                                : '—'}
                            </span>
                            <MaterialIcon
                              name="chevron_right"
                              className="text-lg text-on-surface-variant"
                            />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-auto flex items-start gap-2 border-t border-outline-variant/30 pt-3 font-body-sm text-on-surface-variant">
                  <MaterialIcon name="info" className="mt-0.5 shrink-0 text-base" />
                  Ödeme kartı bilgileri bu hesapta saklanmaz.
                </p>
              </section>
            </div>
          </div>
        </main>
      </div>
    </RequireCustomer>
  );
}
