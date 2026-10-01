'use client';
import { type FormEvent, useState } from 'react';

import { useSession } from '../../components/session-provider';
export default function LoginPage() {
  const { signIn } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      await signIn(String(form.get('identifier')), String(form.get('password')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-brand">
          fastfood<span>.</span>
        </div>
        <div className="art-copy">
          <p className="eyebrow">HER TESLİMATTA YANINIZDA</p>
          <h1>
            Şehrin ritmi,
            <br />
            <em>senin rotan.</em>
          </h1>
          <p>Seferlerini yönet. Teslimat akışını takip et. Günün kontrolü sende.</p>
        </div>
        <div className="route-art">
          <span className="route-line" />
          <span className="route-pin pin-a">A</span>
          <span className="route-pin pin-b">B</span>
          <span className="route-caption">
            BUGÜNÜN ROTASI <b>01 — 08</b>
          </span>
        </div>
        <small>FASTFOOD COURIER · 2026</small>
      </section>
      <section className="login-form-side">
        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">KURYE HESABI</span>
          <h2>Tekrar hoş geldin</h2>
          <p>Devam etmek için kurumsal bilgilerinle giriş yap.</p>
          <label>
            E-posta
            <input
              name="identifier"
              type="email"
              autoComplete="username"
              required
              placeholder="kurye@burgerhome.com"
            />
          </label>
          <label>
            Şifre
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••"
            />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="primary-button login-submit" disabled={busy}>
            {busy ? 'Kontrol ediliyor…' : 'Güvenli giriş yap'} <span>→</span>
          </button>
          <div className="login-privacy">
            ⌑ <span>Oturum bilgilerin şifreli ve güvenli şekilde korunur.</span>
          </div>
        </form>
      </section>
    </main>
  );
}
