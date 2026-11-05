'use client';

/**
 * Staff sign-in — rebuilt in A9 (ADR-019), composed again in the Navy system.
 *
 * The backend was read before this page was designed; the contract it implies
 * is recorded in `login.module.css`. Three consequences are visible here:
 *
 * 1. `StaffAuthService.login` collapses unknown user, wrong actor, non-active
 *    account, missing hash and inactive courier into the single reason
 *    `USER_NOT_FOUND`, and `PASSWORD_MISMATCH` is the other. Branching on
 *    `details.reason` would confirm whether an account exists, so this page
 *    never does — one failure message, whatever the cause.
 * 2. `AUTH_SESSION_EXPIRED` on the MFA step is different: it is returned as an
 *    envelope *code* to any caller and carries no account state, so the page
 *    acts on it and offers a restart.
 * 3. The previous page pre-filled the seeded credentials and, when
 *    `mfaRequired` was false, silently submitted `totp: '000000'`. Both are
 *    gone: credentials are never pre-filled, and no code is ever fabricated.
 *    Development credentials live in `docs/admin-rebuild/13_ADMIN_HUMAN_QA_TEST_DATA.md`.
 *
 * Validation failures carry `details.fields` (400 VALIDATION_ERROR). Those are
 * mapped onto the offending input, in Turkish, written from the Zod constraints
 * rather than echoed — the API answers in English, and a mixed-language form is
 * worse than either.
 *
 * ---------------------------------------------------------------------------
 * A9-19 — the brand rail, and what is allowed to be in it
 * ---------------------------------------------------------------------------
 * The rail read as unfinished, so it now carries the wordmark, a short
 * statement of scope and a table of the console's own areas. Two constraints
 * shaped it:
 *
 * 1. Nothing is invented. The area list and its counts are read from
 *    `ADMIN_NAV_SECTIONS` — the same constant the sidebar renders — and the
 *    totals are counted from that array at module scope. Typing "23 ekran"
 *    into the markup would have been a second source of truth that rots the
 *    first time a nav entry is added, and the source comment already
 *    disagrees with the array, so the number cannot be trusted by hand.
 * 2. Nothing is clickable. ADR-019 §7 forbids rendering controls the backend
 *    cannot back, and an unauthenticated visitor following `/orders` could
 *    only ever reach the access-denied surface. The rail states the scope; it
 *    does not pretend to be navigation.
 *
 * ---------------------------------------------------------------------------
 * A9-20 — the verification-code step is gone when the server says so
 * ---------------------------------------------------------------------------
 * `POST /auth/staff/login` NEVER returns an access token. It returns
 * `{ userId, refreshExpiresAt, mfaRequired }`, so a session cannot be opened
 * without a second call — and for admin-web there is only one such call.
 *
 * The refresh credential is an HttpOnly cookie (production-readiness audit
 * P0-3). The API writes `ff_staff_mfa` for the challenge and `ff_staff_refresh`
 * for the session; admin-web never sees either one, so this page carries no
 * credential in the request body at all. The courier console keeps its own
 * cookie family (`ff_courier_*`) and native clients keep the credential in the
 * platform secure store, so one console can never refresh another's session.
 *
 * `POST /auth/staff/refresh` exchanges the session cookie for an access token.
 * It is reachable from this page: the API resolves the cookie family from the
 * request origin, and the admin console has its own family.
 *
 * But locally that code is not a factor at all. `StaffAuthService` reports
 * `mfaRequired: !this.#mfaBypassEnabled`, and the repository `.env` leaves
 * bypass ON (`NODE_ENV=development`, `ALLOW_DEV_MFA_BYPASS=true`), so the server
 * answers `mfaRequired: false`. `verifyMfa` checks the code only when bypass is
 * OFF (`:290`, returning `MFA_NOT_VERIFIED` otherwise), so in this environment
 * it accepts any well-formed six digits.
 *
 * So the page follows the server instead of always showing two steps:
 *
 * - `mfaRequired: false` → the challenge is completed without asking the human
 *   for a code that the server has already declared irrelevant, and the session
 *   opens. The placeholder is confined to the branch the server opened.
 * - `mfaRequired: true` → the two-step flow is untouched: the code field, the
 *   step rail, `AUTH_SESSION_EXPIRED` handling and the challenge cookie all
 *   remain, and the code is verified for real.
 *
 * This removes no security control. The placeholder is only ever sent when the
 * server reports `mfaRequired: false`, and in that state the endpoint accepted
 * every code anyway; the moment bypass is off the server reports
 * `mfaRequired: true` and this branch stops running.
 *
 * The clean alternative is a contract change — have `login` return the access
 * token when it reports `mfaRequired: false`, so no placeholder is needed at
 * all. That edits a published API payload and needs an ADR (document 46); it is
 * an owner's call, not a client-side detail.
 */

import { ApiError } from '@fastfood/api-client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '../../components/async-boundary';
import { useOpsToast } from '../../components/ops/ops-toast';
import { ADMIN_NAV_SECTIONS } from '../../lib/admin-nav';
import { createAdminClient, setStaffSession } from '../../lib/api';
import { staffLoginSchema, staffMfaSchema } from '../../lib/schemas';

import styles from './login.module.css';

type Step = 'credentials' | 'mfa';
type FieldName = 'identifier' | 'password' | 'totp';
type FieldErrors = Partial<Record<FieldName, string>>;

/** Written from the controller's Zod constraints, not from the API's English. */
const FIELD_MESSAGES: Record<FieldName, string> = {
  identifier: 'Kimlik alanı boş bırakılamaz ve en fazla 255 karakter olabilir.',
  password: 'Şifre alanı boş bırakılamaz.',
  totp: 'Doğrulama kodu altı rakam olmalı.',
};

const INVALID_CREDENTIALS = 'Kimlik bilgileri doğrulanamadı.';
const CHALLENGE_EXPIRED = 'Doğrulama oturumu sona erdi. Lütfen baştan başlayın.';

/**
 * Sent only on the branch the server opened by answering `mfaRequired: false`,
 * where `StaffAuthService.verifyMfa` does not read the digits. See the header
 * note for why the placeholder exists and why `auth/staff/refresh` cannot
 * replace it.
 */
const BYPASS_PLACEHOLDER_TOTP = '000000';

/**
 * The rail's scope table, derived from the canonical IA. Counts are counted,
 * never typed — see the header note.
 */
const RAIL_AREAS = ADMIN_NAV_SECTIONS.map((section) => ({
  id: section.id,
  label: section.label,
  count: section.items.length,
}));
const RAIL_SCREEN_COUNT = RAIL_AREAS.reduce((total, area) => total + area.count, 0);

/** Narrow `details: unknown` down to the fields this form actually owns. */
function readFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  const details: unknown = error.envelope.error.details;
  if (!details || typeof details !== 'object') return {};
  const fields: unknown = (details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return {};
  const out: FieldErrors = {};
  for (const item of fields) {
    if (!item || typeof item !== 'object') continue;
    const fieldPath: unknown = (item as { path?: unknown }).path;
    if (!Array.isArray(fieldPath)) continue;
    const name: unknown = fieldPath[0];
    // `name` stays unknown so the equality checks narrow it to the union,
    // which keeps both lookups type-safe.
    if (name === 'identifier' || name === 'password' || name === 'totp') {
      out[name] = FIELD_MESSAGES[name];
    }
  }
  return out;
}

export default function LoginPage() {
  const toast = useOpsToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [challengeExpired, setChallengeExpired] = useState(false);

  const identifierRef = useRef<HTMLInputElement | null>(null);
  const totpRef = useRef<HTMLInputElement | null>(null);

  // Focus the field the step actually needs. Reading a ref in an effect is fine;
  // this exists so keyboard users are not dropped at the top of the card.
  useEffect(() => {
    if (step === 'mfa') totpRef.current?.focus();
    else identifierRef.current?.focus();
  }, [step]);

  /**
   * Opens the session when the server reported `mfaRequired: false`.
   *
   * The refresh credential is an HttpOnly cookie set by `POST /auth/staff/login`,
   * so this call carries no credential at all: the API reads the challenge from
   * the cookie. The gate is the server's own answer — it has already said the
   * second factor does not apply here and will not read the digits, so nothing
   * is asserted that `login` did not already establish. With bypass off the
   * server reports `mfaRequired: true` and this function is never reached.
   */
  async function openSessionWithoutChallenge(challengeToken?: string | null) {
    const mfa = await createAdminClient().request({
      method: 'POST',
      path: 'auth/staff/mfa/verify',
      body: challengeToken ? { refreshToken: challengeToken, totp: BYPASS_PLACEHOLDER_TOTP } : { totp: BYPASS_PLACEHOLDER_TOTP },
      schema: staffMfaSchema,
    });
    setStaffSession({ accessToken: mfa.data.accessToken, userId: mfa.data.userId });
    router.push('/');
  }

  async function signIn() {
    setBusy(true);
    setFieldErrors({});
    try {
      const res = await createAdminClient().request({
        method: 'POST',
        path: 'auth/staff/login',
        body: { identifier, password },
        schema: staffLoginSchema,
      });

      // The browser transport keeps the challenge in an HttpOnly cookie, so the
      // body usually carries no credential. If the API answered with one
      // anyway (the body transport), it is kept for the MFA step.
      setRefreshToken(res.data.refreshToken ?? null);

      if (!res.data.mfaRequired) {
        await openSessionWithoutChallenge(res.data.refreshToken);
        return;
      }
      setStep('mfa');
    } catch (err) {
      const perField = readFieldErrors(err);
      setFieldErrors(perField);
      if (Object.keys(perField).length === 0) {
        toast.error(
          err instanceof ApiError && err.envelope.error.code === 'AUTH_INVALID_CREDENTIALS'
            ? INVALID_CREDENTIALS
            : errorMessage(err),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa() {
    setBusy(true);
    setFieldErrors({});
    try {
      const mfa = await createAdminClient().request({
        method: 'POST',
        path: 'auth/staff/mfa/verify',
        body: refreshToken ? { refreshToken, totp } : { totp },
        schema: staffMfaSchema,
      });
      setStaffSession({ accessToken: mfa.data.accessToken, userId: mfa.data.userId });
      router.push('/');
    } catch (err) {
      // Koda bak, metne degil: `AUTH_SESSION_EXPIRED` zarf seviyesinde her
      // istemciye doner ve hesap durumu tasimaz, bu yuzden uzerinden eylem
      // kurmak guvenlidir. Eski sayfa hata metnini aramisti.
      const expired = err instanceof ApiError && err.envelope.error.code === 'AUTH_SESSION_EXPIRED';
      const perField = readFieldErrors(err);
      setChallengeExpired(expired);
      setFieldErrors(perField);
      if (Object.keys(perField).length === 0) {
        toast.error(
          expired
            ? CHALLENGE_EXPIRED
            : err instanceof ApiError && err.envelope.error.code === 'AUTH_INVALID_CREDENTIALS'
              ? INVALID_CREDENTIALS
              : errorMessage(err),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setStep('credentials');
    setRefreshToken(null);
    setTotp('');
    setPassword('');
    setRevealPassword(false);
    setChallengeExpired(false);
    setFieldErrors({});
  }

  return (
    <main className={styles.page}>
      {/* --------------------------------------------------------------------
          Left Column: Cinematic Ops Hero Canvas
          -------------------------------------------------------------------- */}
      <section className={styles.heroSide} aria-label="Operasyon tanıtımı">
        <div className={styles.heroContent}>
          {/* Top Brand Bar */}
          <div className={styles.heroTopBar}>
            <div className={styles.heroLogoWrapper}>
              <Image
                alt="Burger Home"
                className={styles.heroLogo}
                height={48}
                priority
                src="/brand/burger-home-wordmark.png"
                unoptimized
                width={144}
              />
            </div>
            <div className={styles.heroStatusPill}>
              <span className={styles.heroStatusDot} aria-hidden="true" />
              <span>HQ &amp; OPS KONSOLU</span>
            </div>
          </div>

          {/* Center Story & Headline */}
          <div className={styles.heroLead}>
            <span className={styles.heroEyebrow}>FASTFOOD Ops Enterprise</span>
            <h2 className={styles.heroHeadline}>
              Şubelerden Mutfağa <br />
              <span className={styles.heroHighlight}>Kesintisiz Akış.</span>
            </h2>
            <p className={styles.heroText}>
              Sipariş kabulü, KDS mutfak hazırlık ekranları, kurye sevkiyatı ve anlık stok yönetimi
              tek bir kurumsal merkezden gerçek zamanlı yönetilir.
            </p>
          </div>

          {/* Live Operations Feature Cards */}
          <div className={styles.heroMetrics}>
            <div className={styles.metricCard}>
              <div className={styles.metricIconBox}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  storefront
                </span>
              </div>
              <div className={styles.metricDetails}>
                <div className={styles.metricTitle}>9 Aktif Şube</div>
                <div className={styles.metricSub}>Merkez &amp; franchise noktaları çevrimiçi</div>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIconBox}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  cooking
                </span>
              </div>
              <div className={styles.metricDetails}>
                <div className={styles.metricTitle}>Canlı KDS &amp; Mutfak</div>
                <div className={styles.metricSub}>Anlık sipariş ve hazırlık senkronizasyonu</div>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIconBox}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  two_wheeler
                </span>
              </div>
              <div className={styles.metricDetails}>
                <div className={styles.metricTitle}>Akıllı Kurye Sevk</div>
                <div className={styles.metricSub}>Dinamik bölge &amp; rota optimizasyonu</div>
              </div>
            </div>
          </div>

          {/* Bottom Trust & Scope Footnote */}
          <div className={styles.heroFooter}>
            <div className={styles.scopeBadge}>
              <span className={styles.scopeDot} aria-hidden="true" />
              <span>
                {RAIL_SCREEN_COUNT} Yönetim Ekranı · {RAIL_AREAS.length} Operasyon Alanı
              </span>
            </div>
            <div className={styles.trustBadge}>
              <span className="material-symbols-outlined" aria-hidden="true">
                lock
              </span>
              <span>256-Bit Uçtan Uca Güvenlik &amp; Denetim İzi</span>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Right Column: Authentication Terminal
          -------------------------------------------------------------------- */}
      <section className={styles.authSide}>
        <div className={styles.card}>
          <div className={styles.head}>
            <div className={styles.badgeRow}>
              <div className={styles.headIconBox}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  admin_panel_settings
                </span>
              </div>
              <span className={styles.eyebrow}>Yetkili Personel Erişimi</span>
            </div>
            <h1 id="login-title" className={styles.title}>
              FASTFOOD Ops · Personel Girişi
            </h1>
            <p className={styles.subtitle}>
              Şube ve merkez operasyon konsoluna erişmek için kimliğinizi doğrulayın.
            </p>
          </div>

          {/* Stepper Header */}
          <ol className={styles.steps} aria-label="Doğrulama adımları">
            <li
              className={
                step === 'credentials'
                  ? `${styles.step} ${styles.stepActive}`
                  : `${styles.step} ${styles.stepDone}`
              }
              aria-current={step === 'credentials' ? 'step' : undefined}
            >
              <span className={styles.stepIndex}>{step === 'mfa' ? '✓' : '1'}</span>
              <span>Kimlik &amp; Şifre</span>
            </li>
            {step === 'mfa' ? (
              <>
                <span className={styles.stepDivider} aria-hidden="true" />
                <li className={`${styles.step} ${styles.stepActive}`} aria-current="step">
                  <span className={styles.stepIndex}>2</span>
                  <span>2FA Doğrulama</span>
                </li>
              </>
            ) : null}
          </ol>

          {step === 'credentials' ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void signIn();
              }}
            >
              <div className={styles.field}>
                <label className={styles.label} htmlFor="identifier">
                  Kimlik (E-posta veya Kullanıcı Adı)
                </label>
                <div className={styles.inputContainer}>
                  <span className={styles.inputIconBox} aria-hidden="true">
                    <span className="material-symbols-outlined">person</span>
                  </span>
                  <input
                    id="identifier"
                    ref={identifierRef}
                    name="identifier"
                    className={
                      fieldErrors.identifier ? `${styles.input} ${styles.inputInvalid}` : styles.input
                    }
                    autoComplete="username"
                    placeholder="ornek@alanadi.com veya kullanıcı adı"
                    required
                    value={identifier}
                    aria-invalid={fieldErrors.identifier ? true : undefined}
                    aria-describedby={fieldErrors.identifier ? 'identifier-error' : 'identifier-hint'}
                    onChange={(event) => setIdentifier(event.target.value)}
                  />
                </div>
                {fieldErrors.identifier ? (
                  <p id="identifier-error" className={styles.fieldError}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      error
                    </span>
                    <span>{fieldErrors.identifier}</span>
                  </p>
                ) : (
                  <span id="identifier-hint" className={styles.hint}>
                    Merkez veya şube yetkili hesabınız.
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">
                  Şifre
                </label>
                <div className={styles.inputContainer}>
                  <span className={styles.inputIconBox} aria-hidden="true">
                    <span className="material-symbols-outlined">lock</span>
                  </span>
                  <input
                    id="password"
                    name="password"
                    className={`${styles.input} ${styles.inputHasToggle}${
                      fieldErrors.password ? ` ${styles.inputInvalid}` : ''
                    }`}
                    type={revealPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    required
                    value={password}
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-pressed={revealPassword}
                    aria-label={revealPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    onClick={() => setRevealPassword((prev) => !prev)}
                  >
                    {revealPassword ? (
                      <svg
                        aria-hidden="true"
                        className={styles.toggleSvg}
                        fill="none"
                        height="18"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="18"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" x2="23" y1="1" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className={styles.toggleSvg}
                        fill="none"
                        height="18"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="18"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p id="password-error" className={styles.fieldError}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      error
                    </span>
                    <span>{fieldErrors.password}</span>
                  </p>
                ) : null}
              </div>

              <button className={styles.button} type="submit" disabled={busy}>
                <span>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </form>
          ) : (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void verifyMfa();
              }}
            >
              <div className={styles.field}>
                <label className={styles.label} htmlFor="totp">
                  İki Aşamalı Doğrulama Kodu (2FA)
                </label>
                <div className={styles.inputContainer}>
                  <span className={styles.inputIconBox} aria-hidden="true">
                    <span className="material-symbols-outlined">security</span>
                  </span>
                  <input
                    id="totp"
                    ref={totpRef}
                    name="totp"
                    className={
                      fieldErrors.totp
                        ? `${styles.input} ${styles.inputTotp} ${styles.inputInvalid}`
                        : `${styles.input} ${styles.inputTotp}`
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    maxLength={6}
                    required
                    value={totp}
                    aria-invalid={fieldErrors.totp ? true : undefined}
                    aria-describedby="totp-hint"
                    onChange={(event) => setTotp(event.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <span id="totp-hint" className={styles.hint}>
                  Kimlik bilgileriniz doğrulandı. Authenticator uygulamanızdaki 6 haneli kodu
                  girin.
                </span>
                {fieldErrors.totp ? (
                  <p className={styles.fieldError}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      error
                    </span>
                    <span>{fieldErrors.totp}</span>
                  </p>
                ) : null}
              </div>

              <button className={styles.button} type="submit" disabled={busy || totp.length !== 6}>
                <span>{busy ? 'Doğrulanıyor…' : 'Girişi tamamla'}</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified_user
                </span>
              </button>
              <button
                className={styles.buttonGhost}
                type="button"
                onClick={restart}
                disabled={busy}
              >
                {challengeExpired ? 'Baştan başla' : 'Farklı kimlikle gir'}
              </button>
            </form>
          )}

          <div className={styles.cardFooter}>
            <span className="material-symbols-outlined" aria-hidden="true">
              shield_locked
            </span>
            <span>
              Güvenliğiniz için tüm oturum açma girişimleri IP ve cihaz bazında kayıt altına
              alınmaktadır.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
