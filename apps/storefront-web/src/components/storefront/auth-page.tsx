'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import {
  authErrorMessage,
  loginWithPassword,
  registerByPhoneAndPassword,
} from '../../lib/storefront/auth';
import { BRAND_NAME, LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { BrandLogo } from './brand-logo';
import { MaterialIcon } from './material-icon';
import { useStorefrontChrome } from './storefront-chrome';

type Tab = 'login' | 'register';
type AuthState = 'idle' | 'loading' | 'login-failed' | 'register-failed' | 'success';

const CLUB_PERKS = [
  'Sipariş geçmişinize ve açık siparişlerinize her cihazdan ulaşın.',
  `${LOYALTY_PROGRAM_NAME} puanınız hesabınızda birikir.`,
  'Favorileriniz, adresleriniz ve iletişim tercihleriniz kayıtlı kalır.',
] as const;

const fieldClass =
  'w-full h-11 pl-10 pr-4 bg-surface-container text-on-surface placeholder:text-on-surface-variant/40 font-body-sm rounded-lg outline-none border border-outline-variant/25 focus:border-secondary-container';

export function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshCart } = useStorefrontChrome();
  const next = params.get('next') || '/account';
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'register' ? 'register' : 'login');
  const [state, setState] = useState<AuthState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  useDeferredLoad(() => {
    if (isCustomerAuthenticated()) {
      router.replace(next.startsWith('/') ? next : '/account');
    }
  }, [next, router]);

  async function afterAuth() {
    setState('success');
    await refreshCart();
    router.replace(next.startsWith('/') ? next : '/account');
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setState('loading');
    try {
      await loginWithPassword(phone.trim(), password);
      await afterAuth();
    } catch (err) {
      setState('login-failed');
      setMessage(authErrorMessage(err));
    }
  }

  async function submitRegister(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setState('loading');
    try {
      const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
      await registerByPhoneAndPassword({
        phoneRaw: registerPhone,
        password: registerPassword,
        displayName: displayName || undefined,
        kvkkAccepted: kvkk,
        newsletterOptIn: newsletter,
      });
      await afterAuth();
    } catch (err) {
      setState('register-failed');
      setMessage(authErrorMessage(err));
    }
  }

  return (
    <div
      className="w-full pt-20 bg-background min-h-screen"
      data-ff-surface="auth"
      data-ff-auth-state={state}
    >
      <div className="relative w-full max-w-6xl mx-auto px-margin-sm lg:px-margin py-6 lg:py-10">
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
          <div className="lg:col-span-7 min-w-0">
            <div className="w-full bg-surface-container-low border border-outline-variant/25 rounded-xl p-5 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <BrandLogo className="h-6 object-contain" />
                <span className="font-label-sm uppercase tracking-widest text-on-surface-variant">
                  Müşteri Girişi
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20 mb-6">
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-md font-label-lg uppercase transition-colors ${tab === 'login' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
                  onClick={() => setTab('login')}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-md font-label-lg uppercase transition-colors ${tab === 'register' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
                  onClick={() => setTab('register')}
                >
                  Kayıt Ol
                </button>
              </div>

              {message ? (
                <p className="mb-4 font-body-sm text-error" role="alert">
                  {message}
                </p>
              ) : null}

              {tab === 'login' ? (
                <div>
                  <h1 className="font-headline-sm text-headline-sm text-on-surface">Giriş yap</h1>
                  <p className="font-body-sm text-on-surface-variant mt-1 mb-5">
                    Kayıtlı telefon numaranız ve şifrenizle devam edin.
                  </p>
                  <form className="flex flex-col gap-3" onSubmit={(e) => void submitLogin(e)}>
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label-md uppercase text-on-surface-variant">
                        Telefon
                      </span>
                      <div className="relative">
                        <MaterialIcon
                          name="call"
                          size={18}
                          className="absolute left-3 top-3 text-on-surface-variant"
                        />
                        <input
                          className={fieldClass}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="05XX XXX XX XX"
                          autoComplete="tel"
                          inputMode="tel"
                          required
                        />
                      </div>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label-md uppercase text-on-surface-variant">Şifre</span>
                      <div className="relative">
                        <MaterialIcon
                          name="lock"
                          size={18}
                          className="absolute left-3 top-3 text-on-surface-variant"
                        />
                        <input
                          className={`${fieldClass} pr-11`}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-2 text-on-surface-variant"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                        >
                          <MaterialIcon
                            name={showPassword ? 'visibility_off' : 'visibility'}
                            size={18}
                          />
                        </button>
                      </div>
                    </label>
                    <button
                      type="submit"
                      disabled={state === 'loading'}
                      className="h-11 mt-1 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase disabled:opacity-50"
                      data-ff-auth-submit="password"
                    >
                      Giriş Yap
                    </button>
                  </form>
                </div>
              ) : (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => void submitRegister(e)}
                  data-ff-register-form
                >
                  <h1 className="font-headline-sm text-headline-sm text-on-surface">Üye ol</h1>
                  <p className="font-body-sm text-on-surface-variant mb-2">
                    Telefon numaranız ve şifrenizle hemen üye olun. SMS doğrulaması bu süreçte
                    kapalıdır (ADR-010).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label-md uppercase text-on-surface-variant">Ad</span>
                      <input
                        className={fieldClass}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label-md uppercase text-on-surface-variant">Soyad</span>
                      <input
                        className={fieldClass}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        required
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label-md uppercase text-on-surface-variant">Telefon</span>
                    <div className="relative">
                      <MaterialIcon
                        name="call"
                        size={18}
                        className="absolute left-3 top-3 text-on-surface-variant"
                      />
                      <input
                        className={fieldClass}
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        autoComplete="tel"
                        inputMode="tel"
                        required
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label-md uppercase text-on-surface-variant">Şifre</span>
                    <input
                      className={fieldClass}
                      type="password"
                      required
                      minLength={10}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="flex items-start gap-3 font-body-sm text-on-surface-variant">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={kvkk}
                      onChange={(e) => setKvkk(e.target.checked)}
                      required
                    />
                    KVKK aydınlatma metnini okudum, kişisel verilerimin işlenmesini kabul ediyorum.
                  </label>
                  <label className="flex items-start gap-3 font-body-sm text-on-surface-variant">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                    />
                    Ember Kulübü e-postalarını almak istiyorum (zorunlu değil).
                  </label>
                  <button
                    type="submit"
                    disabled={state === 'loading'}
                    className="h-11 mt-1 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase disabled:opacity-50"
                    data-ff-auth-submit="register"
                  >
                    Üye ol
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 min-w-0">
            <div className="h-full rounded-xl border border-outline-variant/20 bg-surface-container/40 p-5 sm:p-6">
              <h2 className="font-label-lg uppercase tracking-wide text-on-surface">
                {LOYALTY_PROGRAM_NAME}
              </h2>
              <p className="font-body-sm text-on-surface-variant mt-2">
                {BRAND_NAME} hesabınızla sipariş geçmişinize ve bakiyenize ulaşın. Misafir
                sipariş her zaman açık kalır.
              </p>
              <ul className="mt-5 flex flex-col gap-3">
                {CLUB_PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <MaterialIcon
                      name="check_circle"
                      size={18}
                      className="text-secondary-container mt-0.5 shrink-0"
                    />
                    <span className="font-body-sm text-on-surface-variant">{perk}</span>
                  </li>
                ))}
              </ul>
              <p className="font-body-sm text-on-surface-variant mt-5 pt-4 border-t border-outline-variant/20">
                Puanınız gerçek hesabınıza bağlanır; geçici bir başlangıç bakiyesi gösterilmez.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
