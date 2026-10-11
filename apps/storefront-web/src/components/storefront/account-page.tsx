'use client';

import { ApiError } from '@fastfood/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { clearCustomerSession, isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { fetchMyOrders, patchCustomerProfile, type CustomerOrder } from '../../lib/storefront/account';
import { useSubmitLock } from '../../lib/storefront/account-hooks';
import { fetchLinkedIdentities } from '../../lib/storefront/auth';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
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
      if (err instanceof ApiError && (err.status === 401 || err.envelope.error.code === 'AUTH_UNAUTHENTICATED')) {
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
    useCallback(async (nextName: string, nextEmail: string) => {
      const updated = await patchCustomerProfile({
        displayName: nextName.trim() || undefined,
        email: nextEmail.trim() || undefined,
      });
      setDraft({ name: updated.displayName ?? '', email: updated.email ?? '' });
      setDirty(false);
      refreshProfile();
    }, [setDirty, refreshProfile]),
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
        eyebrow="Hesap"
        title="Hesabın"
        description={`${displayName}, iletişim bilgilerini, sipariş geçmişini ve üyelik durumunu buradan yönet.`}
        actions={
          <Link href="/orders" className="ff-btn ff-btn-outline">
            <MaterialIcon name="receipt_long" />
            Siparişler
          </Link>
        }
      >

        <StatusLedger
          email={ready.email ?? null}
          emailVerified={verified.email ?? ready.emailVerified === true}
          phone={ready.phone ?? null}
          phoneVerified={verified.phone ?? ready.phoneVerified === true}
          tierName={club?.currentTier.displayName ?? null}
          points={points}
          createdAt={ready.createdAt ?? null}
        />

        <form className="ff-section" onSubmit={onSubmit} data-ff-profile-form>
          <div className="ff-section-head">
            <h2 className="ff-section-title">Profil</h2>
            <p className="ff-section-desc">Ad ve e-posta siparişlerinde senin adınla görünür.</p>
          </div>
          <div className="ff-section-body">
            <div className="ff-stack">
              <label className="ff-field">
                <span className="ff-field-label">Ad</span>
                <input
                  className="ff-input"
                  value={name}
                  autoComplete="name"
                  onChange={(event) => {
                    const next = event.target.value;
                    setDraft({ name: next, email });
                    setDirty(true);
                  }}
                />
              </label>
              <label className="ff-field">
                <span className="ff-field-label">E-posta</span>
                <input
                  className="ff-input"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => {
                    const next = event.target.value;
                    setDraft({ name, email: next });
                    setDirty(true);
                  }}
                />
                <span className="ff-field-hint">
                  Sipariş onayları ve kampanya haberleri bu adrese gider.
                </span>
              </label>

              <div className="ff-rows">
                <div className="ff-row">
                  <div className="ff-row-key">
                    <div className="ff-row-label">Telefon</div>
                    <div className="ff-row-hint">Telefon güvenlik ekranından değiştirilir.</div>
                  </div>
                  <div className="ff-row-value">{ready.phone ?? 'Eklenmemiş'}</div>
                  <div className="ff-row-actions">
                    <VerifyTag verified={verified.phone ?? ready.phoneVerified === true} present={Boolean(ready.phone)} />
                  </div>
                </div>
              </div>

              <div className="ff-cluster ff-cluster-end">
                <button
                  type="submit"
                  className="ff-btn ff-btn-primary"
                  disabled={save.pending || !dirty}
                  data-ff-profile-save
                >
                  {save.pending ? 'Kaydediliyor' : 'Değişiklikleri kaydet'}
                </button>
              </div>
            </div>
          </div>
        </form>

        <RecentOrders orders={orders} />

        <ClubSection
          programName={club?.programName ?? LOYALTY_PROGRAM_NAME}
          tierName={club?.currentTier.displayName ?? '—'}
          nextTierName={club?.nextTier?.displayName ?? null}
          points={points}
          pointsRemaining={progress?.pointsRemaining ?? null}
          percent={progress?.percent ?? 0}
          showRail={progress?.showRail ?? false}
        />
    </AccountShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Status — a ledger, not a metric grid                                         */
/* -------------------------------------------------------------------------- */

function StatusLedger(props: {
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  tierName: string | null;
  points: string | null;
  createdAt: string | null;
}) {
  return (
    <section className="ff-section" aria-label="Hesap durumu">
      <div className="ff-section-head">
        <h2 className="ff-section-title">Durum</h2>
        <p className="ff-section-desc">
          {props.createdAt ? `${formatDate(props.createdAt)} tarihinden beri üyesin.` : 'Hesap bilgilerin.'}
        </p>
      </div>
      <div className="ff-section-body">
        <div className="ff-rows">
          <div className="ff-row">
            <div className="ff-row-key">
              <div className="ff-row-label">E-posta</div>
              <div className="ff-row-hint">Sipariş onayları için kullanılır.</div>
            </div>
            <div className="ff-row-value">{props.email ?? 'Eklenmemiş'}</div>
            <div className="ff-row-actions">
              <VerifyTag verified={props.emailVerified} present={Boolean(props.email)} />
              <Link href="/account/security" className="ff-btn ff-btn-ghost ff-btn-sm">
                Güvenlik
              </Link>
            </div>
          </div>

          <div className="ff-row">
            <div className="ff-row-key">
              <div className="ff-row-label">Telefon</div>
              <div className="ff-row-hint">Teslimat adresi doğrulaması için gerekli.</div>
            </div>
            <div className="ff-row-value">{props.phone ?? 'Eklenmemiş'}</div>
            <div className="ff-row-actions">
              <VerifyTag verified={props.phoneVerified} present={Boolean(props.phone)} />
              <Link href="/account/security" className="ff-btn ff-btn-ghost ff-btn-sm">
                Güvenlik
              </Link>
            </div>
          </div>

          <div className="ff-row">
            <div className="ff-row-key">
              <div className="ff-row-label">Üyelik</div>
              <div className="ff-row-hint">Kademe ve mevcut puan.</div>
            </div>
            <div className="ff-row-value">
              {props.tierName ?? '—'}
              {props.points !== null ? (
                <span className="ff-row-hint" style={{ textAlign: 'right' }}>
                  {props.points} puan
                </span>
              ) : null}
            </div>
            <div className="ff-row-actions">
              <Link href="/account/club" className="ff-btn ff-btn-ghost ff-btn-sm">
                Kulüp
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VerifyTag({ verified, present }: { verified: boolean; present: boolean }) {
  if (!present) return <span className="ff-tag" data-tone="warn">Eksik</span>;
  if (!verified) return <span className="ff-tag" data-tone="warn">Doğrulanmadı</span>;
  return <span className="ff-tag" data-tone="ok">Doğrulandı</span>;
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
          {orders.length > 0
            ? `${orders.length} sipariş kayıtlı.`
            : 'Henüz siparişin yok.'}
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
/* Membership — the one hero figure on this screen                             */
/* -------------------------------------------------------------------------- */

function ClubSection(props: {
  programName: string;
  tierName: string;
  nextTierName: string | null;
  points: string | null;
  pointsRemaining: number | null;
  percent: number;
  showRail: boolean;
}) {
  return (
    <section className="ff-section">
      <div className="ff-section-head">
        <h2 className="ff-section-title">Üyelik</h2>
        <p className="ff-section-desc">{props.programName}</p>
      </div>
      <div className="ff-section-body">
        <div className="ff-rows">
          <div className="ff-row" style={{ minHeight: '5rem', alignItems: 'center' }}>
            <div className="ff-row-key">
              <div className="ff-figure" style={{ fontSize: '2.5rem' }}>
                {props.points ?? '—'}
              </div>
              <div className="ff-row-hint" style={{ marginTop: '0.5rem' }}>
                {props.tierName} kademesi
              </div>
            </div>
            <div className="ff-row-key" style={{ flex: '1 1 14rem', maxWidth: '22rem' }}>
              {props.showRail ? (
                <>
                  <div className="ff-meter" role="progressbar" aria-valuenow={props.percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="ff-meter-fill" style={{ width: `${props.percent}%` }} />
                  </div>
                  <div className="ff-cluster" style={{ marginTop: '0.5rem' }}>
                    <span className="ff-row-hint">
                      {props.nextTierName} kademesine {props.pointsRemaining ?? 0} puan kaldı
                    </span>
                  </div>
                </>
              ) : (
                <p className="ff-row-hint">En yüksek kademedesin.</p>
              )}
            </div>
            <div className="ff-row-actions">
              <Link href="/account/club" className="ff-btn ff-btn-outline ff-btn-sm">
                Ayrıntılar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
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