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

import { MaterialIcon } from './material-icon';
import { useStorefrontChrome } from './storefront-chrome';

type Tab = 'login' | 'register';
type AuthState = 'idle' | 'loading' | 'login-failed' | 'register-failed' | 'success';

const fieldClass =
  'w-full h-12 pl-11 pr-4 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/40 font-body-md rounded-lg outline-none focus:bg-surface-container-high focus:ring-1 focus:ring-primary-container';

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
      <div className="relative w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-8 lg:py-16">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-container/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl bg-surface-container-low p-6 sm:p-8 lg:p-10 relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-5">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-primary-container/20 self-start">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
                <MaterialIcon
                  name="local_fire_department"
                  className="text-primary-container text-sm"
                  filled
                />
                <span className="font-label-sm text-label-sm text-primary tracking-wider uppercase">
                  Ember Kulübü Özel Girişi
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase tracking-tight leading-none">
                DUMANI <br />
                <span className="text-primary-container">ÜSTÜNDE</span>
                <br />
                AYRICALIKLAR.
              </h1>
              <p className="font-body-md text-on-surface-variant">
                {BRAND_NAME} hesabınızla sipariş geçmişinize ve {LOYALTY_PROGRAM_NAME} bakiyenize
                ulaşın. Misafir sipariş her zaman açık kalır.
              </p>
              <div className="p-5 rounded-lg bg-surface-container-high/70 flex items-start gap-4">
                <div className="p-3 rounded-lg bg-secondary-container text-on-secondary-container shrink-0">
                  <MaterialIcon name="stars" className="text-2xl" filled />
                </div>
                <div>
                  <span className="font-label-lg text-secondary uppercase tracking-wide">
                    {LOYALTY_PROGRAM_NAME}
                  </span>
                  <p className="font-body-sm text-on-surface-variant mt-1">
                    Gerçek puan bakiyeniz hesaba bağlanır. Sahte hoş geldin bakiyesi gösterilmez.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 flex flex-col justify-center min-w-0">
            <div className="w-full bg-surface-container rounded-xl p-6 sm:p-10">
              <div className="flex items-center p-1.5 rounded-lg bg-surface-container-lowest mb-8">
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-lg font-headline-sm text-sm uppercase ${tab === 'login' ? 'bg-surface-container-high text-on-surface shadow-md' : 'text-on-surface-variant'}`}
                  onClick={() => setTab('login')}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-lg font-headline-sm text-sm uppercase flex items-center justify-center gap-2 ${tab === 'register' ? 'bg-surface-container-high text-on-surface shadow-md' : 'text-on-surface-variant'}`}
                  onClick={() => setTab('register')}
                >
                  Kayıt Ol
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px]">
                    Kulüp
                  </span>
                </button>
              </div>

              {message ? (
                <p className="mb-4 font-body-sm text-error" role="alert">
                  {message}
                </p>
              ) : null}

              {tab === 'login' ? (
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase leading-none">
                    Hoş geldiniz
                  </h2>
                  <p className="font-body-md text-on-surface-variant mt-2 mb-6">
                    Telefon numaran ve şifren ile giriş yap.
                  </p>
                  <form className="flex flex-col gap-4" onSubmit={(e) => void submitLogin(e)}>
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label-sm uppercase text-on-surface-variant">
                        Telefon
                      </span>
                      <div className="relative">
                        <MaterialIcon
                          name="call"
                          className="absolute left-3.5 top-3.5 text-on-surface-variant"
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
                      <span className="font-label-sm uppercase text-on-surface-variant">Şifre</span>
                      <div className="relative">
                        <MaterialIcon
                          name="lock"
                          className="absolute left-3.5 top-3.5 text-on-surface-variant"
                        />
                        <input
                          className={`${fieldClass} pr-12`}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-on-surface-variant"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                        >
                          <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} />
                        </button>
                      </div>
                    </label>
                    <button
                      type="submit"
                      disabled={state === 'loading'}
                      className="h-12 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
                      data-ff-auth-submit="password"
                    >
                      Giriş Yap
                    </button>
                  </form>
                </div>
              ) : (
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => void submitRegister(e)}
                  data-ff-register-form
                >
                  <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase">
                    Kayıt
                  </h2>
                  <p className="font-body-md text-on-surface-variant">
                    Telefon numaran ve şifren ile hemen üye ol. SMS doğrulaması bu süreçte kapalıdır
                    (ADR-010).
                  </p>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label-sm uppercase text-on-surface-variant">Ad</span>
                    <input
                      className="w-full h-12 px-4 bg-surface-container-low rounded-lg"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label-sm uppercase text-on-surface-variant">Soyad</span>
                    <input
                      className="w-full h-12 px-4 bg-surface-container-low rounded-lg"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label-sm uppercase text-on-surface-variant">Telefon</span>
                    <div className="relative">
                      <MaterialIcon
                        name="call"
                        className="absolute left-3.5 top-3.5 text-on-surface-variant"
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
                    <span className="font-label-sm uppercase text-on-surface-variant">Şifre</span>
                    <input
                      className="w-full h-12 px-4 bg-surface-container-low rounded-lg"
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
                      checked={kvkk}
                      onChange={(e) => setKvkk(e.target.checked)}
                      required
                    />
                    KVKK aydınlatma metnini okudum, kişisel verilerimin işlenmesini kabul ediyorum.
                  </label>
                  <label className="flex items-start gap-3 font-body-sm text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                    />
                    Ember Kulübü e-postalarını almak istiyorum (zorunlu değil).
                  </label>
                  <button
                    type="submit"
                    disabled={state === 'loading'}
                    className="h-12 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
                    data-ff-auth-submit="register"
                  >
                    Üye ol
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
