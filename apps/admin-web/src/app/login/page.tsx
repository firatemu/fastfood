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
 * `{ userId, refreshToken, refreshExpiresAt, mfaRequired }`, so a session
 * cannot be opened without a second call — and for admin-web there is only one
 * such call.
 *
 * `POST /auth/staff/refresh` is NOT it. That endpoint opens with
 * `if (!browserSession) throw AUTH_SCOPE_DENIED` and then reads the
 * `ff_courier_refresh` cookie, and `browserSession` is `isCourierWebRequest`,
 * which requires the request origin to equal `COURIER_WEB_ORIGIN` (default
 * `http://localhost:3102`). Admin runs on 3101, so from this page that endpoint
 * is unreachable — it answers 403 `AUTH_SCOPE_DENIED`, never a token. An earlier
 * revision of this file exchanged the login refresh token there and looked
 * correct against every static gate; it could not have worked at runtime.
 *
 * What is left is `POST /auth/staff/mfa/verify`, which accepts the refresh
 * token in the request body for non-browser sessions and requires a
 * syntactically valid six-digit code.
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
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
   * `auth/staff/refresh` cannot be used here — it is courier-web only. This calls
   * the same endpoint the human step would have called, with a well-formed
   * placeholder instead of a typed one. The gate is the server's own answer: it
   * has already said the second factor does not apply here and will not read the
   * digits, so nothing is asserted that `login` did not already establish. With
   * bypass off, `mfaRequired` is `true` and this function is never reached.
   */
  async function openSessionWithoutChallenge(challengeToken: string) {
    const mfa = await createAdminClient().request({
      method: 'POST',
      path: 'auth/staff/mfa/verify',
      body: { refreshToken: challengeToken, totp: BYPASS_PLACEHOLDER_TOTP },
      schema: staffMfaSchema,
    });
    setStaffSession({ accessToken: mfa.data.accessToken, userId: mfa.data.userId });
    router.push('/');
  }

  async function signIn() {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await createAdminClient().request({
        method: 'POST',
        path: 'auth/staff/login',
        body: { identifier, password },
        schema: staffLoginSchema,
      });

      if (!res.data.mfaRequired) {
        await openSessionWithoutChallenge(res.data.refreshToken);
        return;
      }
      setRefreshToken(res.data.refreshToken);
      setStep('mfa');
    } catch (err) {
      const perField = readFieldErrors(err);
      setFieldErrors(perField);
      if (Object.keys(perField).length === 0) {
        setError(
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
    if (!refreshToken) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const mfa = await createAdminClient().request({
        method: 'POST',
        path: 'auth/staff/mfa/verify',
        body: { refreshToken, totp },
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
        setError(
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
    setError(null);
  }

  return (
    <main className={styles.page}>
      <aside className={styles.rail}>
        <div className={styles.railInner}>
          <div className={styles.brand}>
            <Image
              alt="Burger Home"
              className={styles.logo}
              height={200}
              priority
              src="/brand/burger-home-wordmark.png"
              unoptimized
              width={600}
            />
          </div>

          <div className={styles.railCopy}>
            <span className={styles.railEyebrow}>Yetkili personel erişimi</span>
            <p className={styles.railName}>Operasyon konsolu</p>
            <p className={styles.railText}>
              Siparişten teslimata kadar şube, mutfak ve kurye akışlarını yöneten tek ekran. Giriş
              yalnızca yetkili personel içindir.
            </p>
          </div>

          <figure className={styles.hero}>
            <Image
              alt="Servise hazırlanan bir şube mutfağı"
              className={styles.heroImage}
              height={672}
              sizes="(max-width: 900px) 100vw, 520px"
              src="/brand/ops-pass.jpg"
              unoptimized
              width={900}
            />
            <figcaption className={styles.heroCaption}>Şube mutfağından kapıya tek akış</figcaption>
          </figure>

          <div className={styles.scope}>
            <span className={styles.scopeLabel}>Konsol kapsamı</span>
            <ul className={styles.scopeList}>
              {RAIL_AREAS.map((area) => (
                <li key={area.id} className={styles.scopeRow}>
                  <span className={styles.scopeName}>{area.label}</span>
                  <span className={styles.scopeCount}>{area.count}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className={styles.railMeta}>
            {RAIL_SCREEN_COUNT} ekran · {RAIL_AREAS.length} alan · tek oturum
          </p>
        </div>
      </aside>

      <section className={styles.pane}>
        <div className={styles.card}>
          <div className={styles.head}>
            <span className={styles.eyebrow}>Yetki doğrulama</span>
            <h1 id="login-title" className={styles.title}>
              Personel girişi
            </h1>
            <p className={styles.subtitle}>Şube ve merkez operasyon paneline erişim.</p>
          </div>

          {/* The second step exists only once the server has actually asked for a
              code. Rendering it before that would advertise a step this
              environment never reaches. `.step` is always present; only the
              modifier changes — step 1 used to render `.stepActive` on its own,
              losing `display: flex` and stacking its index above the label. */}
          <ol className={styles.steps}>
            <li
              className={
                step === 'credentials'
                  ? `${styles.step} ${styles.stepActive}`
                  : `${styles.step} ${styles.stepDone}`
              }
              aria-current={step === 'credentials' ? 'step' : undefined}
            >
              <span className={styles.stepIndex}>{step === 'mfa' ? '✓' : '1'}</span>
              <span>Kimlik</span>
            </li>
            {step === 'mfa' ? (
              <>
                <span className={styles.stepDivider} aria-hidden="true" />
                <li className={`${styles.step} ${styles.stepActive}`} aria-current="step">
                  <span className={styles.stepIndex}>2</span>
                  <span>Doğrulama</span>
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
                  Kimlik
                </label>
                <input
                  id="identifier"
                  ref={identifierRef}
                  name="identifier"
                  className={
                    fieldErrors.identifier ? `${styles.input} ${styles.inputInvalid}` : styles.input
                  }
                  autoComplete="username"
                  required
                  value={identifier}
                  aria-invalid={fieldErrors.identifier ? true : undefined}
                  aria-describedby={fieldErrors.identifier ? 'identifier-error' : 'identifier-hint'}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
                {fieldErrors.identifier ? (
                  <p id="identifier-error" className={styles.fieldError}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      error
                    </span>
                    <span>{fieldErrors.identifier}</span>
                  </p>
                ) : (
                  <span id="identifier-hint" className={styles.hint}>
                    E-posta, telefon veya kullanıcı adı.
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">
                  Şifre
                </label>
                <div className={styles.control}>
                  <input
                    id="password"
                    name="password"
                    className={`${styles.input} ${styles.inputHasToggle}${
                      fieldErrors.password ? ` ${styles.inputInvalid}` : ''
                    }`}
                    type={revealPassword ? 'text' : 'password'}
                    autoComplete="current-password"
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
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {revealPassword ? 'visibility_off' : 'visibility'}
                    </span>
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
                {busy ? 'Gönderiliyor…' : 'Devam et'}
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
                  Doğrulama kodu
                </label>
                <input
                  id="totp"
                  ref={totpRef}
                  name="totp"
                  className={
                    fieldErrors.totp ? `${styles.input} ${styles.inputInvalid}` : styles.input
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={totp}
                  aria-invalid={fieldErrors.totp ? true : undefined}
                  aria-describedby="totp-hint"
                  onChange={(event) => setTotp(event.target.value.replace(/\D/g, ''))}
                />
                <span id="totp-hint" className={styles.hint}>
                  Kimlik bilgileriniz doğrulandı. Authenticator uygulamanızdaki altı haneli kodu
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
                {busy ? 'Doğrulanıyor…' : 'Girişi tamamla'}
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

          {error ? (
            <p className={`${styles.notice} ${styles.noticeError}`} role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">
                error
              </span>
              <span>{error}</span>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
