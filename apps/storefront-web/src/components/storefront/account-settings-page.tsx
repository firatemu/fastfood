'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import {
  fetchCustomerPreferences,
  patchCustomerPreferences,
  type CustomerPreference,
} from '../../lib/storefront/account';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

type PrefKey = 'orderUpdatesOptIn' | 'marketingOptIn' | 'newsletterOptIn';

/**
 * Preferences.
 *
 * Three switches and two facts, so the screen has no hero, no chart and no
 * dashboard tile — the instrument is a ledger and the only visual event is the
 * switch itself. Each toggle persists immediately and reports through a toast;
 * a rejected toggle re-reads the server so the switch cannot keep showing a
 * state the backend never accepted.
 */
export function AccountSettingsPage() {
  const { toast } = useAccountUi();

  const [prefs, setPrefs] = useState<CustomerPreference | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<PrefKey | null>(null);

  const load = useCallback(async () => {
    try {
      setPrefs(await fetchCustomerPreferences());
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

  const save = useCallback(
    async (key: PrefKey, value: boolean) => {
      if (pendingKey) return;
      setPendingKey(key);
      setError(null);
      try {
        setPrefs(await patchCustomerPreferences({ [key]: value }));
        toast.ok('Tercih kaydedildi.');
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        toast.error('Tercih kaydedilemedi.', message);
        // Snap the switch back to the server truth instead of leaving it
        // showing a value the backend rejected.
        void load();
      } finally {
        setPendingKey(null);
      }
    },
    [load, pendingKey, toast],
  );

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error' || !prefs) {
    return <ShopError title="Tercihler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  return (
    <AccountShell
      surface="account-settings"
      eyebrow="Hesap · Tercihler"
      title="Tercihler"
      description="Bu tercihler hesabına yazılır ve cihazların arasında taşınır. Sepet ve arayüz durumu tarayıcında kalır."
    >
      {error ? (
        <div className="ff-notice" data-tone="danger" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Bildirim</h2>
          <p className="ff-section-desc">Siparişin durumunu nasıl öğrenirsin?</p>
        </div>
        <div className="ff-section-body">
          <div className="ff-rows">
            <PreferenceRow
              id="order-updates"
              label="Sipariş bildirimleri"
              description="Hazırlanma, yola çıkma ve teslim durumundaki değişiklikler."
              checked={prefs.orderUpdatesOptIn}
              busy={pendingKey === 'orderUpdatesOptIn'}
              onChange={(value) => void save('orderUpdatesOptIn', value)}
            />
          </div>
        </div>
      </section>

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">İletişim</h2>
          <p className="ff-section-desc">Sipariş dışında sana ulaşmamızı isteyip istemediğin.</p>
        </div>
        <div className="ff-section-body">
          <div className="ff-rows">
            <PreferenceRow
              id="marketing"
              label="Pazarlama iletişimi"
              description="Kampanya ve yeni ürün duyuruları e-posta ile."
              checked={prefs.marketingOptIn}
              busy={pendingKey === 'marketingOptIn'}
              onChange={(value) => void save('marketingOptIn', value)}
            />
            <PreferenceRow
              id="newsletter"
              label="Ember Kulübü e-postası"
              description="Üyelik puanı ve ayrıcalık duyuruları."
              checked={prefs.newsletterOptIn}
              busy={pendingKey === 'newsletterOptIn'}
              testId="newsletter"
              onChange={(value) => void save('newsletterOptIn', value)}
            />
          </div>
        </div>
      </section>

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Kayıt</h2>
          <p className="ff-section-desc">Hesabının değiştiremeyeceğin kayıtları.</p>
        </div>
        <div className="ff-section-body">
          <div className="ff-rows">
            <div className="ff-row">
              <div className="ff-row-key">
                <div className="ff-row-label">KVKK onayı</div>
                <div className="ff-row-hint">Açık rıza beyanı hesabın açılışında alındı.</div>
              </div>
              <div className="ff-row-value">
                {prefs.kvkkAcceptedAt ? formatDate(prefs.kvkkAcceptedAt) : 'Kayıtlı değil'}
              </div>
            </div>
            <Link
              href="/account/security"
              className="ff-row ff-row-select"
              data-ff-row="security-link"
            >
              <div className="ff-row-key">
                <div className="ff-row-label">E-posta doğrulama ve şifre</div>
                <div className="ff-row-hint">
                  Doğrulama durumun ve parolan Güvenlik sayfasında yönetilir.
                </div>
              </div>
              <div className="ff-row-actions">
                <MaterialIcon name="shield" className="ff-muted-icon" />
                <MaterialIcon name="chevron_right" className="ff-muted-icon" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </AccountShell>
  );
}

function PreferenceRow(props: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
  testId?: string;
}) {
  return (
    <div className="ff-row">
      {/* The label wraps the input, so the whole row is the hit area and the
          control keeps native keyboard semantics. */}
      <label className="ff-row-key" htmlFor={props.id}>
        <div className="ff-row-label">{props.label}</div>
        <div className="ff-row-hint">{props.description}</div>
      </label>
      <div className="ff-row-actions">
        <label className="ff-switch" htmlFor={props.id}>
          <input
            id={props.id}
            type="checkbox"
            checked={props.checked}
            disabled={props.busy}
            data-ff-newsletter={props.testId ? true : undefined}
            onChange={(event) => props.onChange(event.target.checked)}
          />
          <span className="ff-switch-track" aria-hidden />
        </label>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}