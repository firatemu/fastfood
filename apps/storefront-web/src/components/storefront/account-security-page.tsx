'use client';

import { useCallback, useState } from 'react';

import { clearCustomerSession, isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { deleteCustomerAccount } from '../../lib/storefront/account';
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
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const removeAccount = useSubmitLock(
    useCallback(async () => {
      await deleteCustomerAccount();
    }, []),
  );

  const confirmDeletion = useCallback(async () => {
    if (
      !window.confirm('Hesabın kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?')
    ) {
      return;
    }
    setDeleteError(null);
    try {
      await removeAccount.run();
      clearCustomerSession();
      window.location.href = '/hesap-silme?silindi=1';
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
  }, [removeAccount]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return (
      <ShopError title="Güvenlik" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
    );
  }

  const posture = securityPosture(identities);
  const hasPassword = identities.hasPassword;

  return (
    <AccountShell
      surface="account-security"
      eyebrow="Hesap Güvenliği"
      title="Güvenlik & Giriş"
      description="Hesap şifreni güncelleyebilir, doğrulama durumunu inceleyebilir ve güvenlik tercihlerini yönetebilirsin."
    >
      {/* 1. Güvenlik Durumu Özeti */}
      <section className="ff-card mb-6" data-ff-security-posture={posture.level}>
        <div className="ff-card-header">
          <div>
            <h2 className="ff-card-title">
              <MaterialIcon name="shield" />
              Hesap Güvenlik Durumu
            </h2>
            <p className="ff-card-desc">{posture.summary}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="ff-segments"
              role="img"
              aria-label={`Güvenlik adımlarının ${posture.score}/${posture.total} kadarı tamamlandı`}
            >
              {posture.checks.map((check) => (
                <span key={check.id} data-on={check.satisfied ? 'true' : 'false'} />
              ))}
            </span>
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant">
              {posture.score}/{posture.total} Adım
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {posture.checks.map((check) => (
            <div
              key={check.id}
              className="p-4 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{check.label}</span>
                  <span className="ff-tag" data-tone={check.satisfied ? 'ok' : 'warn'}>
                    {check.satisfied ? 'Doğrulandı' : 'Bekliyor'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {check.satisfied ? check.doneHint : check.hint}
                </p>
              </div>

              {!check.satisfied && check.id === 'email' ? (
                <button
                  type="button"
                  className="ff-btn ff-btn-outline ff-btn-sm mt-3 w-full"
                  disabled={sendVerification.pending}
                  onClick={() => void verifyEmail()}
                >
                  <MaterialIcon name="mark_email_read" />
                  {sendVerification.pending ? 'Gönderiliyor...' : 'Doğrulama E-postası Gönder'}
                </button>
              ) : null}

              {!check.satisfied && check.id === 'phone' ? (
                <div className="text-xs text-on-surface-variant mt-3 italic">
                  Giriş / Kayıt ekranından doğrulanır
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* 2. İki Sütunlu Form & Bilgi Alanı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sol Sütun: Şifre Güncelleme Formu */}
        <form className="ff-card" onSubmit={submitPassword}>
          <div className="ff-card-header">
            <div>
              <h2 className="ff-card-title">
                <MaterialIcon name="lock" />
                {hasPassword ? 'Şifre Değiştir' : 'Şifre Belirle'}
              </h2>
              <p className="ff-card-desc">
                {hasPassword
                  ? 'Mevcut şifreni girerek yeni güçlü bir şifre oluştur.'
                  : 'Hesabına parola belirleyerek girişini güçlendir.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 max-w-lg">
            {hasPassword ? (
              <label className="ff-field">
                <span className="ff-field-label">Mevcut Şifre</span>
                <input
                  type="password"
                  className="ff-input"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setDirty(true);
                  }}
                />
              </label>
            ) : null}

            <label className="ff-field">
              <span className="ff-field-label">Yeni Şifre</span>
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
                  if (confirmError && value === confirmPassword) setConfirmError(null);
                }}
              />
              {error ? (
                <span className="ff-field-error" role="alert">
                  {error}
                </span>
              ) : (
                <span className="ff-field-hint">
                  En az 10 karakter uzunluğunda olmalıdır.
                </span>
              )}
            </label>

            <label className="ff-field">
              <span className="ff-field-label">Yeni Şifre (Tekrar)</span>
              <input
                type="password"
                className="ff-input"
                autoComplete="new-password"
                minLength={10}
                required
                placeholder="Yeni şifreyi tekrar giriniz"
                value={confirmPassword}
                onChange={(event) => {
                  const value = event.target.value;
                  setConfirmPassword(value);
                  setDirty(true);
                  if (confirmError && value === nextPassword) setConfirmError(null);
                }}
                onBlur={() => {
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
              ) : null}
            </label>

            <div className="pt-2">
              <button
                type="submit"
                className="ff-btn ff-btn-primary"
                disabled={savePassword.pending}
              >
                <MaterialIcon name="check" />
                {savePassword.pending
                  ? 'Kaydediliyor...'
                  : hasPassword
                    ? 'Şifreyi Güncelle'
                    : 'Şifreyi Belirle'}
              </button>
            </div>
          </div>
        </form>

        {/* Sağ Sütun: Bağlı Hesaplar & Oturumlar */}
        <div className="flex flex-col gap-6">
          <div className="ff-card">
            <div className="ff-card-header">
              <div>
                <h2 className="ff-card-title">
                  <MaterialIcon name="link" />
                  Bağlı Hesaplar
                </h2>
                <p className="ff-card-desc">Hesaba bağlı kimlik sağlayıcıları.</p>
              </div>
            </div>

            {identities.identities.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/60 text-xs text-on-surface-variant flex items-center gap-3">
                <MaterialIcon name="info" />
                <span>Google veya Apple ile giriş yapmadınız. Telefon/E-posta ile giriş aktiftir.</span>
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

          <div className="ff-card">
            <div className="ff-card-header">
              <div>
                <h2 className="ff-card-title">
                  <MaterialIcon name="devices" />
                  Aktif Cihaz Oturumu
                </h2>
                <p className="ff-card-desc">Cihaz güvenliği ve oturum sonlandırma.</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/60 text-xs text-on-surface-variant flex items-start gap-3">
              <MaterialIcon name="info" />
              <span>
                Şu anda bu tarayıcı üzerinden aktif bir güvenli oturumdasınız. Diğer cihazlardan çıkmak için şifrenizi yenileyebilir veya menüdeki Çıkış Yap butonunu kullanabilirsiniz.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tehlikeli Bölge / Hesabı Sil */}
      <section className="ff-card border-danger/30 bg-danger/5" data-ff-account-deletion>
        <div className="ff-card-header border-danger/20">
          <div>
            <h2 className="ff-card-title text-danger">
              <MaterialIcon name="warning" />
              Tehlikeli Bölge: Hesabı Sil
            </h2>
            <p className="ff-card-desc">
              Ad, telefon, e-posta, kayıtlı adresler ve kuponlar kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-outline accent-danger"
              checked={deleteConfirmed}
              onChange={(event) => setDeleteConfirmed(event.target.checked)}
            />
            <span className="text-xs text-on-surface-variant font-medium">
              Hesabımın ve tüm kişisel verilerimin geri döndürülemez biçimde silineceğini anlıyorum.
            </span>
          </label>

          {deleteError ? (
            <div className="ff-notice" data-tone="danger" role="alert">
              <MaterialIcon name="error" />
              <span>{deleteError}</span>
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              className="ff-btn ff-btn-danger"
              disabled={!deleteConfirmed || removeAccount.pending}
              onClick={() => void confirmDeletion()}
            >
              <MaterialIcon name="delete_forever" />
              {removeAccount.pending ? 'Siliniyor...' : 'Hesabımı Kalıcı Olarak Sil'}
            </button>
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
