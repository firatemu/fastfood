'use client';

import { Alert, Button, FormField, Input, OtpInput, PasswordInput, Panel } from '@fastfood/ui-web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '../../components/async-boundary';
import { createAdminClient, setStaffSession } from '../../lib/api';
import { staffLoginSchema, staffMfaSchema } from '../../lib/schemas';

/**
 * Staff login.
 *
 * Local human-test defaults match `apps/api/prisma/seed.ts`:
 *   staff@fastfood.local / DevStaffPass1!  (override via SEED_STAFF_PASSWORD)
 */
export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('staff@fastfood.local');
  const [password, setPassword] = useState('DevStaffPass1!');
  const [totp, setTotp] = useState('123456');
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const client = createAdminClient();
      const res = await client.request({
        method: 'POST',
        path: 'auth/staff/login',
        body: { identifier, password },
        schema: staffLoginSchema,
      });
      setStaffSession({ refreshToken: res.data.refreshToken, userId: res.data.userId });
      if (res.data.mfaRequired) {
        setRefreshToken(res.data.refreshToken);
        setStep('mfa');
        setInfo(
          'MFA gerekli. Geliştirme ortamında 6 haneli herhangi bir kod denenebilir (bypass açıkken).',
        );
        return;
      }
      const mfa = await client.request({
        method: 'POST',
        path: 'auth/staff/mfa/verify',
        body: { refreshToken: res.data.refreshToken, totp: '000000' },
        schema: staffMfaSchema,
      });
      setStaffSession({ accessToken: mfa.data.accessToken, userId: mfa.data.userId });
      router.push('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa() {
    if (!refreshToken) return;
    setBusy(true);
    setError(null);
    try {
      const client = createAdminClient();
      const mfa = await client.request({
        method: 'POST',
        path: 'auth/staff/mfa/verify',
        body: { refreshToken, totp },
        schema: staffMfaSchema,
      });
      setStaffSession({ accessToken: mfa.data.accessToken, userId: mfa.data.userId });
      router.push('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ff-admin-login-card" aria-labelledby="login-heading">
      <h1 id="login-heading" className="ff-admin-login-title">
        FASTFOOD Ops
      </h1>
      <p className="ff-admin-login-sub">Personel girişi</p>
      <Panel title={step === 'login' ? 'Kimlik bilgileri' : 'MFA doğrulama'}>
        {step === 'login' ? (
          <>
            <FormField id="identifier" label="E-posta / kullanıcı adı" required>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </FormField>
            <FormField id="password" label="Şifre" required>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <Button type="button" onClick={() => void login()} loading={busy} fullWidth>
              Giriş yap
            </Button>
          </>
        ) : (
          <>
            <FormField id="totp" label="6 haneli TOTP" required>
              <OtpInput length={6} value={totp} onChange={setTotp} label="TOTP kodu" />
            </FormField>
            <Button type="button" onClick={() => void verifyMfa()} loading={busy} fullWidth>
              Doğrula
            </Button>
          </>
        )}
      </Panel>
      {info ? (
        <Alert variant="info" title="Bilgi">
          {info}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="danger" title="Giriş başarısız">
          {error}
        </Alert>
      ) : null}
      <Alert variant="warning" title="Seed notu">
        Yerel hesap: staff@fastfood.local / DevStaffPass1! (`pnpm db:seed`).
      </Alert>
    </main>
  );
}
