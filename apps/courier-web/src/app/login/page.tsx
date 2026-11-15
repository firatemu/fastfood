'use client';

import { type FormEvent, useRef, useState } from 'react';

import { CheckCircleIcon, RouteIcon } from '../../components/icons';
import { useSession } from '../../components/session-provider';
import { courierErrorMessage } from '../../lib/api';

const SANDBOX_ACCOUNTS = [
  { label: 'Azem Kurye', identifier: 'azem@azemyazilim.com', secret: '84238423Aa' },
  { label: 'Dev Courier', identifier: 'kurye@burgerhome.com', secret: '84238423Aa' },
] as const;

export default function LoginPage() {
  const { signIn } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get('identifier') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (!identifier || !password) {
      setError('Lütfen kullanıcı adı/e-posta ve şifre alanlarını doldurun.');
      return;
    }

    setBusy(true);
    try {
      await signIn(identifier, password);
    } catch (err) {
      setError(
        courierErrorMessage(
          err,
          'Kullanıcı adı/e-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function fillCredentials(identifier: string, secret: string) {
    setError('');
    if (identifierRef.current) identifierRef.current.value = identifier;
    if (passwordRef.current) passwordRef.current.value = secret;
  }

  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-brand">
          fastfood<span>.</span>
        </div>

        <div className="art-copy">
          <p className="eyebrow">SAHA TESLİMAT MERKEZİ</p>
          <h1>
            Şehrin ritmi,
            <br />
            <em>senin rotan.</em>
          </h1>
          <p>
            Aktif seferlerini yönet, şube havuzundan QR ile sipariş al ve teslimat durumlarını tek
            dokunuşla güncelle.
          </p>

          <ul className="login-feature-list">
            <li>
              <CheckCircleIcon size={16} />
              <span>Canlı şube havuzu ve tek dokunuşla QR teslim alma</span>
            </li>
            <li>
              <CheckCircleIcon size={16} />
              <span>Sipariş içeriği, kapı kodu, teslimat notu ve tek tıkla navigasyon</span>
            </li>
            <li>
              <CheckCircleIcon size={16} />
              <span>Mobil ve masaüstü için tam uyumlu kurye arayüzü</span>
            </li>
          </ul>
        </div>

        <div className="route-art" aria-hidden="true">
          <span className="route-line" />
          <span className="route-pin pin-a">A</span>
          <span className="route-pin pin-b">B</span>
          <span className="route-caption">
            <RouteIcon size={14} /> BUGÜNÜN ROTASI <b>AKTİF SAHA</b>
          </span>
        </div>

        <small>FASTFOOD COURIER · TÜM EKRANLARDA DUYARLI TASARIM</small>
      </section>

      <section className="login-form-side">
        <form className="login-form" noValidate onSubmit={submit}>
          <span className="eyebrow">KURYE HESABI</span>
          <h2>Tekrar hoş geldin</h2>
          <p>Devam etmek için kurumsal kurye bilgilerinle giriş yap.</p>

          <label>
            E-posta veya Kullanıcı Adı
            <input
              ref={identifierRef}
              name="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              required
              placeholder="azem@azemyazilim.com"
            />
          </label>

          <label>
            Şifre
            <div className="password-field">
              <input
                ref={passwordRef}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••••"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </label>

          {error && (
            <div className="form-error" role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button className="primary-button login-submit" disabled={busy}>
            <span>{busy ? 'Kontrol ediliyor…' : 'Güvenli giriş yap'}</span>
            <span aria-hidden="true">→</span>
          </button>

          <div className="quick-fill-box">
            <span className="eyebrow">HIZLI TEST HESAPLARI</span>
            <div className="quick-fill-actions">
              {SANDBOX_ACCOUNTS.map((account) => (
                <button
                  key={account.identifier}
                  type="button"
                  className="chip-button"
                  onClick={() => fillCredentials(account.identifier, account.secret)}
                >
                  <b>{account.label}</b>
                  <small>{account.identifier}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="login-privacy">
            <span aria-hidden="true">⌑</span>
            <span>Oturum bilgilerin şifreli ve güvenli şekilde korunur.</span>
          </div>
        </form>
      </section>
    </main>
  );
}
