'use client';

import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { useSubmitLock } from '../../lib/storefront/account-hooks';
import { securityPosture } from '../../lib/storefront/account-security-posture';
import {
  changeCustomerPassword,
  createCustomerPassword,
  fetchLinkedIdentities,
  requestEmailVerification,
} from '../../lib/storefront/auth';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

type LinkedIdentity = { provider: string; emailNormalized: string | null };

/**
 * Security.
 *
 * Ordered by risk, not by feature. The derived posture leads because it is the
 * question the customer actually has; the password form is the page's single
 * primary action; everything else is stated plainly. The backend exposes no
 * device or session inventory, so this screen says so instead of drawing a
 * fabricated "active sessions" list.
 */
export function AccountSecurityPage() {
  const { setDirty, toast } = useAccountUi();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const [identities, setIdentities] = useState<{
    hasPassword: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    identities: LinkedIdentity[];
  }>({ hasPassword: false, emailVerified: false, phoneVerified: false, identities: [] });

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchLinkedIdentities();
      setIdentities({
        hasPassword: data.hasPassword,
        emailVerified: data.emailVerified,
        phoneVerified: data.phoneVerified,
        identities: data.identities,
      });
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

  const savePassword = useSubmitLock(
    useCallback(
      async (current: string, next: string) => {
        if (identities.hasPassword) {
          await changeCustomerPassword(current, next);
        } else {
          await createCustomerPassword(next);
        }
      },
      [identities.hasPassword],
    ),
  );

  const submitPassword = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (nextPassword.length < 10) {
        setError('Şifre en az 10 karakter olmalı.');
        return;
      }
      // Compared raw, never trimmed: a leading or trailing space is a legal part
      // of a password, and trimming here would validate a string the API never
      // receives.
      if (nextPassword !== confirmPassword) {
        setConfirmError('Yeni şifre alanları eşleşmiyor.');
        return;
      }
      setError(null);
      setConfirmError(null);
      try {
        await savePassword.run(currentPassword, nextPassword);
        setCurrentPassword('');
        setNextPassword('');
        setConfirmPassword('');
        setDirty(false);
        toast.ok('Şifren güncellendi.');
        await load();
      } catch (err) {
        setError(errorMessage(err));
        toast.error('Şifre güncellenemedi.', errorMessage(err));
      }
    },
    [confirmPassword, currentPassword, load, nextPassword, savePassword, setDirty, toast],
  );

  const sendVerification = useSubmitLock(
    useCallback(async () => {
      await requestEmailVerification();
    }, []),
  );

  const verifyEmail = useCallback(async () => {
    try {
      await sendVerification.run();
      toast.ok('Doğrulama isteği alındı.', 'E-postanı kontrol et.');
    } catch (err) {
      toast.error('Doğrulama gönderilemedi.', errorMessage(err));
    }
  }, [sendVerification, toast]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return <ShopError title="Güvenlik" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  const posture = securityPosture(identities);
  const hasPassword = identities.hasPassword;

  return (
    <AccountShell
      surface="account-security"
      eyebrow="Hesap · Güvenlik"
      title="Güvenlik"
      description="Parolan, doğrulama kanıtların ve bu hesaba bağlı olduğun kimlik sağlayıcıları."
    >
      <section className="ff-section" data-ff-security-posture={posture.level}>
        <div className="ff-section-head">
          <h2 className="ff-section-title">Güvenlik durumu</h2>
          <p className="ff-section-desc">{posture.summary}</p>
        </div>
        <div className="ff-section-body">
          <div className="ff-rows">
            {posture.checks.map((check) => (
              <div className="ff-row" key={check.id} style={{ alignItems: 'center' }}>
                <div className="ff-row-key">
                  <div className="ff-row-label">{check.label}</div>
                  <div className="ff-row-hint">{check.satisfied ? check.doneHint : check.hint}</div>
                </div>
                <div className="ff-row-actions">
                  {!check.satisfied && check.id === 'email' ? (
                    <button
                      type="button"
                      className="ff-btn ff-btn-outline ff-btn-sm"
                      disabled={sendVerification.pending}
                      onClick={() => void verifyEmail()}
                    >
                      <MaterialIcon name="mark_email_read" />
                      {sendVerification.pending ? 'Gönderiliyor' : 'Doğrulama gönder'}
                    </button>
                  ) : null}
                  {!check.satisfied && check.id === 'phone' ? (
                    <span className="ff-row-hint">Kayıt ekranından tamamlanır</span>
                  ) : null}
                  <span
                    className="ff-tag"
                    data-tone={check.satisfied ? 'ok' : 'warn'}
                  >
                    {check.satisfied ? 'Tamam' : 'Bekliyor'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="ff-cluster" style={{ marginTop: '0.75rem' }}>
            <span
              className="ff-segments"
              role="img"
              aria-label={`Güvenlik adımlarının ${posture.score}/${posture.total} kadarı tamamlandı`}
            >
              {posture.checks.map((check) => (
                <span key={check.id} data-on={check.satisfied ? 'true' : 'false'} />
              ))}
            </span>
            <span className="ff-row-hint">
              {posture.headline} · {posture.score}/{posture.total}
            </span>
          </div>
        </div>
      </section>

      <form className="ff-section" onSubmit={submitPassword}>
        <div className="ff-section-head">
          <h2 className="ff-section-title">{hasPassword ? 'Şifreni değiştir' : 'Şifre belirle'}</h2>
          <p className="ff-section-desc">
            {hasPassword
              ? 'Mevcut şifreni girerek yenisini belirle.'
              : 'Bu hesap şu anda parolasız. Parola belirleyerek girişini güçlendir.'}
          </p>
        </div>
        <div className="ff-section-body">
          <div className="ff-stack">
            {hasPassword ? (
              <label className="ff-field">
                <span className="ff-field-label">Mevcut şifre</span>
                <input
                  type="password"
                  className="ff-input"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setDirty(true);
                  }}
                />
              </label>
            ) : null}
            <label className="ff-field">
              <span className="ff-field-label">Yeni şifre</span>
              <input
                type="password"
                className="ff-input"
                autoComplete="new-password"
                minLength={10}
                required
                placeholder="En az 10 karakter"
                value={nextPassword}
                onChange={(event) => {
                  const value = event.target.value;
                  setNextPassword(value);
                  setDirty(true);
                  // Editing either field can make the two agree; drop the
                  // complaint as soon as they do.
                  if (confirmError && value === confirmPassword) setConfirmError(null);
                }}
              />
              {error ? (
                <span className="ff-field-error" role="alert">
                  {error}
                </span>
              ) : (
                <span className="ff-field-hint">En az 10 karakter. Uzun bir cümle daha güvenlidir.</span>
              )}
            </label>
            <label className="ff-field">
              <span className="ff-field-label">Yeni şifre (tekrar)</span>
              <input
                type="password"
                className="ff-input"
                autoComplete="new-password"
                minLength={10}
                required
                placeholder="Yeni şifreyi ikinci kez gir"
                value={confirmPassword}
                onChange={(event) => {
                  const value = event.target.value;
                  setConfirmPassword(value);
                  setDirty(true);
                  if (confirmError && value === nextPassword) setConfirmError(null);
                }}
                onBlur={() => {
                  // Added here, once the field is left — never while it is still
                  // being typed into — but removed above the moment it stops
                  // being true.
                  setConfirmError(
                    confirmPassword && confirmPassword !== nextPassword
                      ? 'Yeni şifre alanları eşleşmiyor.'
                      : null,
                  );
                }}
              />
              {confirmError ? (
                <span className="ff-field-error" role="alert">
                  {confirmError}
                </span>
              ) : (
                <span className="ff-field-hint">Doğrulama için yeni şifreyi ikinci kez gir.</span>
              )}
            </label>
            <div className="ff-cluster ff-cluster-end">
              <button
                type="submit"
                className="ff-btn ff-btn-primary"
                disabled={savePassword.pending}
              >
                {savePassword.pending ? 'Kaydediliyor' : hasPassword ? 'Şifreyi güncelle' : 'Şifreyi belirle'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Bağlı hesaplar</h2>
          <p className="ff-section-desc">Bu hesabın bağlı olduğu kimlik sağlayıcıları.</p>
        </div>
        <div className="ff-section-body">
          {identities.identities.length === 0 ? (
            <div className="ff-empty">
              <MaterialIcon name="link_off" />
              <p className="ff-empty-title">Bağlı sosyal hesap yok</p>
              <p className="ff-empty-text">
                Google veya Apple ile giriş yapmadıysan bu liste boş kalır.
              </p>
            </div>
          ) : (
            <div className="ff-rows">
              {identities.identities.map((identity) => (
                <div
                  className="ff-row"
                  key={`${identity.provider}-${identity.emailNormalized ?? 'none'}`}
                >
                  <div className="ff-row-key">
                    <div className="ff-row-label">{providerLabel(identity.provider)}</div>
                  </div>
                  <div className="ff-row-value">
                    {identity.emailNormalized ?? 'E-posta bağlı değil'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Oturum</h2>
          <p className="ff-section-desc">Bu cihazdan çıkış ve oturum yönetimi.</p>
        </div>
        <div className="ff-section-body">
          <div className="ff-notice" data-tone="info">
            <MaterialIcon name="info" />
            <span>
              Açık oturumların listesi sunulmuyor. Bu cihazdan çıkmak için Hesap menüsündeki
              Çıkış yap kullanılır; tüm cihazlardan çıkış henüz desteklenmiyor.
            </span>
          </div>
        </div>
      </section>
    </AccountShell>
  );
}

/** `EMAIL_PASSWORD` → `Email password`. The API sends raw enum codes. */
function providerLabel(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!words) return value;
  return words.charAt(0).toLocaleUpperCase('tr-TR') + words.slice(1);
}