import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable, Optional } from '@nestjs/common';

import { getAppConfig } from '../../../bootstrap/app-config.js';
import {
  createOtpService,
  generateRefreshToken,
  hashRefreshToken,
  InMemoryOtpChallengeStore,
  scryptPasswordHasher,
  verifyRefreshTokenShape,
  type OtpService,
  type PasswordHasher,
} from '../../../common/crypto/index.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

import {
  createDefaultOAuthAdapters,
  type OAuthProviderAdapter,
  type OAuthProviderCode,
  type OAuthProfile,
} from './oauth-providers.js';

interface CustomerSessionRecord {
  refreshTokenHash: string;
  familyId: string;
  customerId: string;
  expiresAt: Date;
}

interface MemoryUser {
  id: string;
  displayName: string | null;
  phoneNormalized: string | null;
  phoneVerified: boolean;
  emailNormalized: string | null;
  emailVerified: boolean;
  passwordHash: string | null;
  identities: Array<{
    provider: 'PHONE_OTP' | 'EMAIL_PASSWORD' | 'GOOGLE' | 'APPLE';
    subject: string;
    emailNormalized: string | null;
    emailVerifiedByProvider: boolean;
  }>;
}

interface OAuthStateRecord {
  provider: OAuthProviderCode;
  returnTo: string;
  linkUserId: string | null;
  expiresAt: number;
}

export type AuthSessionOk = {
  ok: true;
  customerId: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

export type OtpFailReason =
  | 'OTP_INVALID'
  | 'OTP_NOT_FOUND'
  | 'OTP_EXPIRED'
  | 'OTP_ATTEMPTS_EXHAUSTED'
  | 'OTP_MISMATCH'
  | 'OTP_COOLDOWN'
  | 'OTP_SUSPENDED';

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

class HitWindow {
  readonly #hits = new Map<string, number[]>();

  allow(key: string, max: number, windowMs = WINDOW_MS): boolean {
    const now = Date.now();
    const next = (this.#hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (next.length >= max) {
      this.#hits.set(key, next);
      return false;
    }
    next.push(now);
    this.#hits.set(key, next);
    return true;
  }

  retryAfterSeconds(key: string, windowMs = WINDOW_MS): number {
    const now = Date.now();
    const next = (this.#hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const oldest = next[0];
    if (oldest === undefined) return 0;
    return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  }
}

/**
 * Customer authentication — OTP remains first-class; password and OAuth
 * attach identities to the same User. Unverified emails never auto-merge.
 */
@Injectable()
export class CustomerAuthService {
  readonly #otpService: OtpService;
  readonly #sessions = new Map<string, CustomerSessionRecord>();
  readonly #memoryUsers = new Map<string, MemoryUser>();
  readonly #oauthState = new Map<string, OAuthStateRecord>();
  readonly #emailTokens = new Map<string, { userId: string; email: string; expiresAt: number }>();
  readonly #resetTokens = new Map<string, { userId: string; expiresAt: number }>();
  readonly #otpLastRequest = new Map<string, number>();
  readonly #otpWindow = new HitWindow();
  readonly #passwordWindow = new HitWindow();
  readonly #resetWindow = new HitWindow();
  #hasher: PasswordHasher = scryptPasswordHasher;
  #oauth: OAuthProviderAdapter[] = createDefaultOAuthAdapters();

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {
    this.#otpService = createOtpService(new InMemoryOtpChallengeStore());
  }

  /** Test-only seams — never used by HTTP controllers. */
  useTestHasher(hasher: PasswordHasher): void {
    this.#hasher = hasher;
  }

  useTestOAuthAdapters(adapters: OAuthProviderAdapter[]): void {
    this.#oauth = adapters;
  }

  methods(): { otp: boolean; password: true; google: boolean; apple: boolean } {
    return {
      otp: !this.#isOtpSuspended(),
      password: true,
      google: this.#adapter('google')?.isConfigured() === true,
      apple: this.#adapter('apple')?.isConfigured() === true,
    };
  }

  /** ADR-010: read the registration OTP suspension flag. */
  #isOtpSuspended(): boolean {
    return getAppConfig().CUSTOMER_REGISTRATION_OTP_SUSPENDED === true;
  }

  /**
   * ADR-010: register a new customer by phone + password + KVKK without
   * SMS verification. The phone field stays required; ownership proof is
   * deferred until OTP is re-enabled. Re-enabling OTP is a config flip
   * (`CUSTOMER_REGISTRATION_OTP_SUSPENDED=false`); this code path then
   * returns `OTP_SUSPENDED` and clients fall back to the OTP flow.
   */
  async registerByPhoneAndPassword(input: {
    phoneNormalized: string;
    password: string;
    displayName?: string;
    kvkkAccepted: boolean;
    newsletterOptIn?: boolean;
  }): Promise<
    | AuthSessionOk
    | {
        ok: false;
        reason: 'KVKK_REQUIRED' | 'PASSWORD_POLICY' | 'OTP_SUSPENDED' | 'PHONE_ALREADY_REGISTERED';
      }
  > {
    if (!this.#isOtpSuspended()) {
      return { ok: false, reason: 'OTP_SUSPENDED' };
    }
    if (!input.kvkkAccepted) {
      return { ok: false, reason: 'KVKK_REQUIRED' };
    }
    if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) {
      return { ok: false, reason: 'PASSWORD_POLICY' };
    }
    const passwordHash = await this.#hasher.hash(input.password);
    const customerId = await this.#createPhoneCustomer({
      phoneNormalized: input.phoneNormalized,
      passwordHash,
      displayName: input.displayName?.trim() || input.phoneNormalized,
      newsletterOptIn: input.newsletterOptIn === true,
    });
    if (customerId === null) {
      return { ok: false, reason: 'PHONE_ALREADY_REGISTERED' };
    }
    return this.#issueSession(customerId);
  }

  async requestOtp(
    phoneNormalized: string,
  ): Promise<
    | { ok: true; expiresAt: Date }
    | { ok: false; reason: 'OTP_COOLDOWN' | 'OTP_SUSPENDED'; retryAfterSeconds: number }
  > {
    if (this.#isOtpSuspended()) {
      return { ok: false, reason: 'OTP_SUSPENDED', retryAfterSeconds: 0 };
    }
    const cfg = getAppConfig();
    if (!this.#otpWindow.allow(phoneNormalized, cfg.OTP_MAX_REQUESTS_PER_15_MIN)) {
      return {
        ok: false,
        reason: 'OTP_COOLDOWN',
        retryAfterSeconds: this.#otpWindow.retryAfterSeconds(phoneNormalized),
      };
    }
    const last = this.#otpLastRequest.get(phoneNormalized) ?? 0;
    const wait = cfg.OTP_REQUEST_COOLDOWN_SECONDS * 1000 - (Date.now() - last);
    if (wait > 0) {
      return { ok: false, reason: 'OTP_COOLDOWN', retryAfterSeconds: Math.ceil(wait / 1000) };
    }
    const { expiresAt } = await this.#otpService.request(phoneNormalized);
    this.#otpLastRequest.set(phoneNormalized, Date.now());
    return { ok: true, expiresAt };
  }

  async verifyOtp(
    phoneNormalized: string,
    code: string,
    displayName?: string,
  ): Promise<AuthSessionOk | { ok: false; reason: OtpFailReason }> {
    if (this.#isOtpSuspended()) {
      return { ok: false, reason: 'OTP_SUSPENDED' };
    }
    const result = await this.#otpService.verify(phoneNormalized, code);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    const customerId = await this.#ensurePhoneCustomer(phoneNormalized, displayName);
    return this.#issueSession(customerId);
  }

  async registerPassword(input: {
    email: string;
    password: string;
    displayName?: string;
    kvkkAccepted: boolean;
    newsletterOptIn?: boolean;
  }): Promise<
    | (AuthSessionOk & { emailVerificationToken?: string })
    | { ok: false; reason: 'KVKK_REQUIRED' | 'PASSWORD_POLICY' | 'EMAIL_TAKEN' }
  > {
    if (!input.kvkkAccepted) {
      return { ok: false, reason: 'KVKK_REQUIRED' };
    }
    if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) {
      return { ok: false, reason: 'PASSWORD_POLICY' };
    }
    const email = normalizeEmail(input.email);
    const existing = await this.#findPasswordIdentity(email);
    if (existing) {
      return { ok: false, reason: 'EMAIL_TAKEN' };
    }
    const verifiedOwner = await this.#findVerifiedEmailUser(email);
    if (verifiedOwner) {
      return { ok: false, reason: 'EMAIL_TAKEN' };
    }
    const passwordHash = await this.#hasher.hash(input.password);
    const customerId = await this.#createPasswordCustomer({
      email,
      passwordHash,
      displayName: input.displayName?.trim() || email.split('@')[0] || 'Misafir',
      newsletterOptIn: input.newsletterOptIn === true,
    });
    const verify = await this.#issueEmailVerification(customerId, email);
    const session = await this.#issueSession(customerId);
    return {
      ...session,
      emailVerificationToken: this.#exposeDevToken(verify.token),
    };
  }

  async loginPassword(
    identifierRaw: string,
    password: string,
  ): Promise<AuthSessionOk | { ok: false; reason: 'AUTH_INVALID_CREDENTIALS' | 'RATE_LIMITED' }> {
    const identifier = identifierRaw.trim();
    const looksLikePhone = /^\+?\d{10,15}$/.test(identifier.replace(/[\s\-()]/g, ''));
    if (!this.#passwordWindow.allow(`pw:${identifier.toLowerCase()}`, 5)) {
      return { ok: false, reason: 'RATE_LIMITED' };
    }
    const found = looksLikePhone
      ? await this.#findPasswordIdentityByPhone(this.#normalizePhoneLoose(identifier))
      : await this.#findPasswordIdentity(normalizeEmail(identifier));
    if (!found?.passwordHash) {
      await this.#hasher.hash(password);
      return { ok: false, reason: 'AUTH_INVALID_CREDENTIALS' };
    }
    const ok = await this.#hasher.verify(password, found.passwordHash);
    if (!ok) {
      return { ok: false, reason: 'AUTH_INVALID_CREDENTIALS' };
    }
    return this.#issueSession(found.userId);
  }

  #normalizePhoneLoose(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('90')) return `+${digits}`;
    if (digits.startsWith('0')) return `+9${digits}`;
    return `+${digits}`;
  }

  async #findPasswordIdentityByPhone(
    phoneNormalized: string,
  ): Promise<{ userId: string; passwordHash: string | null } | null> {
    if (!this.prisma) {
      for (const user of this.#memoryUsers.values()) {
        if (user.phoneNormalized === phoneNormalized && user.passwordHash) {
          return { userId: user.id, passwordHash: user.passwordHash };
        }
      }
      return null;
    }
    const profile = await this.prisma.customerProfile.findUnique({
      where: { phoneNormalized },
    });
    if (!profile) return null;
    const cred = await this.prisma.customerCredential.findUnique({
      where: { userId: profile.userId },
    });
    return { userId: profile.userId, passwordHash: cred?.passwordHash ?? null };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    nextPassword: string,
  ): Promise<
    | { ok: true }
    | { ok: false; reason: 'AUTH_INVALID_CREDENTIALS' | 'PASSWORD_POLICY' | 'NO_PASSWORD' }
  > {
    if (nextPassword.length < PASSWORD_MIN || nextPassword.length > PASSWORD_MAX) {
      return { ok: false, reason: 'PASSWORD_POLICY' };
    }
    const cred = await this.#getCredential(userId);
    if (!cred) {
      return { ok: false, reason: 'NO_PASSWORD' };
    }
    const matches = await this.#hasher.verify(currentPassword, cred);
    if (!matches) {
      return { ok: false, reason: 'AUTH_INVALID_CREDENTIALS' };
    }
    const passwordHash = await this.#hasher.hash(nextPassword);
    await this.#setCredential(userId, passwordHash);
    return { ok: true };
  }

  async createPassword(
    userId: string,
    nextPassword: string,
  ): Promise<{ ok: true } | { ok: false; reason: 'PASSWORD_POLICY' | 'ALREADY_SET' }> {
    if (nextPassword.length < PASSWORD_MIN || nextPassword.length > PASSWORD_MAX) {
      return { ok: false, reason: 'PASSWORD_POLICY' };
    }
    const existing = await this.#getCredential(userId);
    if (existing) {
      return { ok: false, reason: 'ALREADY_SET' };
    }
    const passwordHash = await this.#hasher.hash(nextPassword);
    await this.#setCredential(userId, passwordHash);
    const email = await this.#emailForUser(userId);
    if (email) {
      await this.#upsertIdentity(userId, 'EMAIL_PASSWORD', email, email, false);
    }
    return { ok: true };
  }

  async requestPasswordReset(emailRaw: string): Promise<{ ok: true; resetToken?: string }> {
    const email = normalizeEmail(emailRaw);
    if (!this.#resetWindow.allow(`rst:${email}`, 3)) {
      return { ok: true };
    }
    const found = await this.#findPasswordIdentity(email);
    if (!found) {
      return { ok: true };
    }
    const token = generateRefreshToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = Date.now() + 30 * 60 * 1000;
    if (!this.prisma) {
      this.#resetTokens.set(tokenHash, { userId: found.userId, expiresAt });
    } else {
      await this.prisma.passwordResetChallenge.create({
        data: {
          userId: found.userId,
          tokenHash,
          expiresAt: new Date(expiresAt),
        },
      });
    }
    return { ok: true, resetToken: this.#exposeDevToken(token) };
  }

  async confirmPasswordReset(
    token: string,
    nextPassword: string,
  ): Promise<
    { ok: true } | { ok: false; reason: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'PASSWORD_POLICY' }
  > {
    if (nextPassword.length < PASSWORD_MIN || nextPassword.length > PASSWORD_MAX) {
      return { ok: false, reason: 'PASSWORD_POLICY' };
    }
    const tokenHash = hashOpaqueToken(token);
    const now = Date.now();
    if (!this.prisma) {
      const row = this.#resetTokens.get(tokenHash);
      if (!row) return { ok: false, reason: 'TOKEN_INVALID' };
      if (row.expiresAt < now) {
        this.#resetTokens.delete(tokenHash);
        return { ok: false, reason: 'TOKEN_EXPIRED' };
      }
      this.#resetTokens.delete(tokenHash);
      await this.#setCredential(row.userId, await this.#hasher.hash(nextPassword));
      return { ok: true };
    }
    const row = await this.prisma.passwordResetChallenge.findUnique({ where: { tokenHash } });
    if (!row || row.consumedAt) return { ok: false, reason: 'TOKEN_INVALID' };
    if (row.expiresAt.getTime() < now) {
      return { ok: false, reason: 'TOKEN_EXPIRED' };
    }
    const passwordHash = await this.#hasher.hash(nextPassword);
    await this.prisma.$transaction([
      this.prisma.passwordResetChallenge.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.customerCredential.upsert({
        where: { userId: row.userId },
        create: {
          userId: row.userId,
          passwordHash,
          passwordAlgo: 'scrypt',
          passwordUpdatedAt: new Date(),
        },
        update: {
          passwordHash,
          passwordAlgo: 'scrypt',
          passwordUpdatedAt: new Date(),
        },
      }),
    ]);
    return { ok: true };
  }

  async requestEmailVerification(
    userId: string,
  ): Promise<{ ok: true; token?: string } | { ok: false; reason: 'NO_EMAIL' }> {
    const email = await this.#emailForUser(userId);
    if (!email) return { ok: false, reason: 'NO_EMAIL' };
    const issued = await this.#issueEmailVerification(userId, email);
    return { ok: true, token: this.#exposeDevToken(issued.token) };
  }

  async confirmEmailVerification(
    token: string,
  ): Promise<
    { ok: true; customerId: string } | { ok: false; reason: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' }
  > {
    const tokenHash = hashOpaqueToken(token);
    const now = Date.now();
    if (!this.prisma) {
      const row = this.#emailTokens.get(tokenHash);
      if (!row) return { ok: false, reason: 'TOKEN_INVALID' };
      if (row.expiresAt < now) {
        this.#emailTokens.delete(tokenHash);
        return { ok: false, reason: 'TOKEN_EXPIRED' };
      }
      this.#emailTokens.delete(tokenHash);
      const user = this.#memoryUsers.get(row.userId);
      if (user) {
        user.emailVerified = true;
        user.emailNormalized = row.email;
      }
      return { ok: true, customerId: row.userId };
    }
    const row = await this.prisma.emailVerificationChallenge.findUnique({ where: { tokenHash } });
    if (!row || row.consumedAt) return { ok: false, reason: 'TOKEN_INVALID' };
    if (row.expiresAt.getTime() < now) return { ok: false, reason: 'TOKEN_EXPIRED' };
    await this.prisma.$transaction([
      this.prisma.emailVerificationChallenge.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.customerProfile.upsert({
        where: { userId: row.userId },
        create: {
          userId: row.userId,
          emailNormalized: row.emailNormalized,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          locale: 'tr-TR',
        },
        update: {
          emailNormalized: row.emailNormalized,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);
    return { ok: true, customerId: row.userId };
  }

  startOAuth(
    provider: OAuthProviderCode,
    returnTo = '/account',
    linkUserId?: string,
  ):
    | { ok: true; authorizationUrl: string }
    | { ok: false; reason: 'OAUTH_UNAVAILABLE' | 'OAUTH_UNKNOWN_PROVIDER' } {
    const adapter = this.#adapter(provider);
    if (!adapter) return { ok: false, reason: 'OAUTH_UNKNOWN_PROVIDER' };
    if (!adapter.isConfigured()) return { ok: false, reason: 'OAUTH_UNAVAILABLE' };
    const cfg = getAppConfig();
    const redirectUri =
      provider === 'google' ? cfg.GOOGLE_OAUTH_REDIRECT_URI : cfg.APPLE_OAUTH_REDIRECT_URI;
    const state = randomBytes(24).toString('base64url');
    this.#oauthState.set(state, {
      provider,
      returnTo: returnTo.startsWith('/') ? returnTo : '/account',
      linkUserId: linkUserId ?? null,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return { ok: true, authorizationUrl: adapter.authorizationUrl(state, redirectUri) };
  }

  async completeOAuth(
    provider: OAuthProviderCode,
    input: { code?: string; state?: string; error?: string },
  ): Promise<
    | (AuthSessionOk & { returnTo: string })
    | {
        ok: false;
        reason: 'OAUTH_CANCELLED' | 'OAUTH_FAILED' | 'OAUTH_UNAVAILABLE' | 'STATE_INVALID';
        returnTo: string;
      }
  > {
    const stateKey = input.state;
    const stateRow = stateKey ? this.#oauthState.get(stateKey) : undefined;
    if (
      !stateKey ||
      !stateRow ||
      stateRow.provider !== provider ||
      stateRow.expiresAt < Date.now()
    ) {
      return { ok: false, reason: 'STATE_INVALID', returnTo: '/auth' };
    }
    this.#oauthState.delete(stateKey);
    if (input.error) {
      return { ok: false, reason: 'OAUTH_CANCELLED', returnTo: stateRow.returnTo };
    }
    const adapter = this.#adapter(provider);
    if (!adapter?.isConfigured()) {
      return { ok: false, reason: 'OAUTH_UNAVAILABLE', returnTo: stateRow.returnTo };
    }
    if (!input.code) {
      return { ok: false, reason: 'OAUTH_FAILED', returnTo: stateRow.returnTo };
    }
    const cfg = getAppConfig();
    const redirectUri =
      provider === 'google' ? cfg.GOOGLE_OAUTH_REDIRECT_URI : cfg.APPLE_OAUTH_REDIRECT_URI;
    let profile: OAuthProfile;
    try {
      profile = await adapter.exchangeAuthorizationCode(input.code, redirectUri);
    } catch {
      return { ok: false, reason: 'OAUTH_FAILED', returnTo: stateRow.returnTo };
    }
    const prismaProvider = provider === 'google' ? 'GOOGLE' : 'APPLE';
    const customerId = await this.#resolveOAuthUser(prismaProvider, profile, stateRow.linkUserId);
    const session = await this.#issueSession(customerId);
    return { ...session, returnTo: stateRow.returnTo };
  }

  /**
   * Resolve a customer from an opaque refresh token without rotating it.
   * Used by AuthGuard / storefront identity — X-User-Id is never trusted.
   */
  async resolveSession(
    refreshToken: string,
  ): Promise<{ customerId: string; sessionId: string } | null> {
    if (!verifyRefreshTokenShape(refreshToken)) {
      return null;
    }
    const tokenHash = hashRefreshToken(refreshToken);
    if (!this.prisma) {
      for (const [key, entry] of this.#sessions) {
        if (entry.refreshTokenHash === tokenHash) {
          if (entry.expiresAt.getTime() < Date.now()) {
            this.#sessions.delete(key);
            return null;
          }
          return { customerId: entry.customerId, sessionId: entry.familyId };
        }
      }
      return null;
    }
    const row = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
    });
    if (!row || row.revokedAt) {
      return null;
    }
    if (row.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return { customerId: row.userId, sessionId: row.id };
  }

  async refresh(
    refreshToken: string,
  ): Promise<
    AuthSessionOk | { ok: false; reason: 'TOKEN_MALFORMED' | 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' }
  > {
    if (!verifyRefreshTokenShape(refreshToken)) {
      return { ok: false, reason: 'TOKEN_MALFORMED' };
    }
    const tokenHash = hashRefreshToken(refreshToken);
    if (!this.prisma) {
      let foundKey: string | null = null;
      let foundEntry: CustomerSessionRecord | null = null;
      for (const [key, entry] of this.#sessions) {
        if (entry.refreshTokenHash === tokenHash) {
          foundKey = key;
          foundEntry = entry;
          break;
        }
      }
      if (!foundKey || !foundEntry) {
        return { ok: false, reason: 'TOKEN_NOT_FOUND' };
      }
      if (foundEntry.expiresAt.getTime() < Date.now()) {
        this.#sessions.delete(foundKey);
        return { ok: false, reason: 'TOKEN_EXPIRED' };
      }
      this.#sessions.delete(foundKey);
      return this.#issueSession(foundEntry.customerId, foundEntry.familyId);
    }

    const row = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
    });
    if (!row || row.revokedAt) {
      return { ok: false, reason: 'TOKEN_NOT_FOUND' };
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.update({
        where: { id: row.id },
        data: { revokedAt: new Date(), revokedReason: 'EXPIRED' },
      });
      return { ok: false, reason: 'TOKEN_EXPIRED' };
    }
    await this.prisma.session.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), revokedReason: 'ROTATED' },
    });
    return this.#issueSession(row.userId, row.familyId);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    if (!verifyRefreshTokenShape(refreshToken)) {
      return { ok: true };
    }
    const tokenHash = hashRefreshToken(refreshToken);
    if (!this.prisma) {
      for (const [key, entry] of this.#sessions) {
        if (entry.refreshTokenHash === tokenHash) {
          this.#sessions.delete(key);
          return { ok: true };
        }
      }
      return { ok: true };
    }
    const row = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
    });
    if (row && !row.revokedAt) {
      await this.prisma.session.update({
        where: { id: row.id },
        data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
      });
    }
    return { ok: true };
  }

  async linkedMethods(userId: string): Promise<{
    phoneVerified: boolean;
    emailVerified: boolean;
    hasPassword: boolean;
    identities: Array<{ provider: string; emailNormalized: string | null }>;
  }> {
    if (!this.prisma) {
      const user = this.#memoryUsers.get(userId);
      return {
        phoneVerified: user?.phoneVerified ?? false,
        emailVerified: user?.emailVerified ?? false,
        hasPassword: Boolean(user?.passwordHash),
        identities: (user?.identities ?? []).map((i) => ({
          provider: i.provider,
          emailNormalized: i.emailNormalized,
        })),
      };
    }
    const [profile, cred, identities] = await Promise.all([
      this.prisma.customerProfile.findUnique({ where: { userId } }),
      this.prisma.customerCredential.findUnique({ where: { userId } }),
      this.prisma.authIdentity.findMany({ where: { userId } }),
    ]);
    return {
      phoneVerified: profile?.phoneVerified ?? false,
      emailVerified: profile?.emailVerified ?? false,
      hasPassword: Boolean(cred),
      identities: identities.map((i) => ({
        provider: i.provider,
        emailNormalized: i.emailNormalized,
      })),
    };
  }

  async #issueSession(customerId: string, familyId?: string): Promise<AuthSessionOk> {
    const family = familyId ?? crypto.randomUUID();
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const refreshTokenHash = hashRefreshToken(refreshToken);
    if (!this.prisma) {
      this.#sessions.set(family, {
        refreshTokenHash,
        familyId: family,
        customerId,
        expiresAt: refreshExpiresAt,
      });
    } else {
      await this.prisma.session.create({
        data: {
          userId: customerId,
          refreshTokenHash,
          familyId: family,
          expiresAt: refreshExpiresAt,
        },
      });
    }
    return { ok: true, customerId, refreshToken, refreshExpiresAt };
  }

  async #ensurePhoneCustomer(phoneNormalized: string, displayName?: string): Promise<string> {
    const resolvedDisplayName = displayName?.trim() || phoneNormalized;
    if (!this.prisma) {
      for (const user of this.#memoryUsers.values()) {
        if (user.phoneNormalized === phoneNormalized) return user.id;
      }
      const id = `01900000-0000-7000-8000-${phoneNormalized.replace(/\D/g, '').padStart(12, '0').slice(0, 12)}`;
      this.#memoryUsers.set(id, {
        id,
        displayName: resolvedDisplayName,
        phoneNormalized,
        phoneVerified: true,
        emailNormalized: null,
        emailVerified: false,
        passwordHash: null,
        identities: [
          {
            provider: 'PHONE_OTP',
            subject: phoneNormalized,
            emailNormalized: null,
            emailVerifiedByProvider: false,
          },
        ],
      });
      return id;
    }
    const existing = await this.prisma.customerProfile.findUnique({
      where: { phoneNormalized },
    });
    if (existing) {
      await this.#upsertIdentity(existing.userId, 'PHONE_OTP', phoneNormalized, null, false);
      return existing.userId;
    }
    const user = await this.prisma.user.create({
      data: {
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        primaryIdentifier: phoneNormalized,
        primaryIdentifierType: 'PHONE',
        displayName: resolvedDisplayName,
        customerProfile: {
          create: {
            phoneNormalized,
            phoneVerified: true,
            locale: 'tr-TR',
          },
        },
      },
    });
    await this.#upsertIdentity(user.id, 'PHONE_OTP', phoneNormalized, null, false);
    return user.id;
  }

  async #createPasswordCustomer(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    newsletterOptIn: boolean;
  }): Promise<string> {
    if (!this.prisma) {
      const id = crypto.randomUUID();
      this.#memoryUsers.set(id, {
        id,
        displayName: input.displayName,
        phoneNormalized: null,
        phoneVerified: false,
        emailNormalized: input.email,
        emailVerified: false,
        passwordHash: input.passwordHash,
        identities: [
          {
            provider: 'EMAIL_PASSWORD',
            subject: input.email,
            emailNormalized: input.email,
            emailVerifiedByProvider: false,
          },
        ],
      });
      return id;
    }
    const user = await this.prisma.user.create({
      data: {
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        primaryIdentifier: input.email,
        primaryIdentifierType: 'EMAIL',
        displayName: input.displayName,
        customerProfile: {
          create: {
            emailNormalized: input.email,
            emailVerified: false,
            locale: 'tr-TR',
          },
        },
        customerCredential: {
          create: {
            passwordHash: input.passwordHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
        },
        customerPreference: {
          create: {
            newsletterOptIn: input.newsletterOptIn,
            kvkkAcceptedAt: new Date(),
            locale: 'tr-TR',
          },
        },
      },
    });
    await this.#upsertIdentity(user.id, 'EMAIL_PASSWORD', input.email, input.email, false);
    if (input.newsletterOptIn) {
      await this.prisma.newsletterSubscription.upsert({
        where: { email: input.email },
        create: { email: input.email, source: 'ember_club', userId: user.id },
        update: { unsubscribedAt: null, userId: user.id },
      });
    }
    return user.id;
  }

  /**
   * ADR-010: phone + password registration without SMS verification.
   * `phoneVerified: false` is recorded so re-enabling OTP later can
   * recognize which customers never proved ownership. Returns `null`
   * when the phone already has a profile.
   */
  async #createPhoneCustomer(input: {
    phoneNormalized: string;
    passwordHash: string;
    displayName: string;
    newsletterOptIn: boolean;
  }): Promise<string | null> {
    if (!this.prisma) {
      for (const user of this.#memoryUsers.values()) {
        if (user.phoneNormalized === input.phoneNormalized) return null;
      }
      const id = crypto.randomUUID();
      this.#memoryUsers.set(id, {
        id,
        displayName: input.displayName,
        phoneNormalized: input.phoneNormalized,
        phoneVerified: false,
        emailNormalized: null,
        emailVerified: false,
        passwordHash: input.passwordHash,
        identities: [
          {
            provider: 'PHONE_OTP',
            subject: input.phoneNormalized,
            emailNormalized: null,
            emailVerifiedByProvider: false,
          },
        ],
      });
      return id;
    }
    const existing = await this.prisma.customerProfile.findUnique({
      where: { phoneNormalized: input.phoneNormalized },
    });
    if (existing) return null;
    const user = await this.prisma.user.create({
      data: {
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        primaryIdentifier: input.phoneNormalized,
        primaryIdentifierType: 'PHONE',
        displayName: input.displayName,
        customerProfile: {
          create: {
            phoneNormalized: input.phoneNormalized,
            phoneVerified: false,
            locale: 'tr-TR',
          },
        },
        customerCredential: {
          create: {
            passwordHash: input.passwordHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
        },
        customerPreference: {
          create: {
            newsletterOptIn: input.newsletterOptIn,
            kvkkAcceptedAt: new Date(),
            locale: 'tr-TR',
          },
        },
      },
    });
    await this.#upsertIdentity(user.id, 'PHONE_OTP', input.phoneNormalized, null, false);
    return user.id;
  }

  async #resolveOAuthUser(
    provider: 'GOOGLE' | 'APPLE',
    profile: OAuthProfile,
    linkUserId: string | null,
  ): Promise<string> {
    const existing = await this.#findIdentity(provider, profile.subject);
    if (existing) return existing;
    if (linkUserId) {
      await this.#upsertIdentity(
        linkUserId,
        provider,
        profile.subject,
        profile.emailNormalized ?? null,
        profile.emailVerifiedByProvider,
      );
      return linkUserId;
    }
    if (profile.emailNormalized && profile.emailVerifiedByProvider) {
      const verified = await this.#findVerifiedEmailUser(profile.emailNormalized);
      if (verified) {
        await this.#upsertIdentity(
          verified,
          provider,
          profile.subject,
          profile.emailNormalized,
          true,
        );
        return verified;
      }
    }
    if (!this.prisma) {
      const id = crypto.randomUUID();
      this.#memoryUsers.set(id, {
        id,
        displayName: profile.emailNormalized?.split('@')[0] ?? provider,
        phoneNormalized: null,
        phoneVerified: false,
        emailNormalized: profile.emailNormalized ?? null,
        emailVerified: profile.emailVerifiedByProvider && Boolean(profile.emailNormalized),
        passwordHash: null,
        identities: [
          {
            provider,
            subject: profile.subject,
            emailNormalized: profile.emailNormalized ?? null,
            emailVerifiedByProvider: profile.emailVerifiedByProvider,
          },
        ],
      });
      return id;
    }
    const user = await this.prisma.user.create({
      data: {
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        primaryIdentifier:
          profile.emailNormalized ?? `${provider.toLowerCase()}:${profile.subject}`,
        primaryIdentifierType: profile.emailNormalized ? 'EMAIL' : undefined,
        displayName: profile.emailNormalized?.split('@')[0] ?? 'BURGER HOME',
        customerProfile: {
          create: {
            emailNormalized: profile.emailNormalized ?? null,
            emailVerified: Boolean(profile.emailNormalized && profile.emailVerifiedByProvider),
            emailVerifiedAt:
              profile.emailNormalized && profile.emailVerifiedByProvider ? new Date() : null,
            locale: 'tr-TR',
          },
        },
      },
    });
    await this.#upsertIdentity(
      user.id,
      provider,
      profile.subject,
      profile.emailNormalized ?? null,
      profile.emailVerifiedByProvider,
    );
    return user.id;
  }

  async #upsertIdentity(
    userId: string,
    provider: 'PHONE_OTP' | 'EMAIL_PASSWORD' | 'GOOGLE' | 'APPLE',
    subject: string,
    emailNormalized: string | null,
    emailVerifiedByProvider: boolean,
  ): Promise<void> {
    if (!this.prisma) {
      const user = this.#memoryUsers.get(userId);
      if (!user) return;
      user.identities = user.identities.filter(
        (i) => !(i.provider === provider && i.subject === subject),
      );
      user.identities.push({
        provider,
        subject,
        emailNormalized,
        emailVerifiedByProvider,
      });
      return;
    }
    await this.prisma.authIdentity.upsert({
      where: { provider_providerSubject: { provider, providerSubject: subject } },
      create: {
        userId,
        provider,
        providerSubject: subject,
        emailNormalized,
        emailVerifiedByProvider,
      },
      update: { emailNormalized, emailVerifiedByProvider },
    });
  }

  async #findIdentity(
    provider: 'PHONE_OTP' | 'EMAIL_PASSWORD' | 'GOOGLE' | 'APPLE',
    subject: string,
  ): Promise<string | null> {
    if (!this.prisma) {
      for (const user of this.#memoryUsers.values()) {
        if (user.identities.some((i) => i.provider === provider && i.subject === subject)) {
          return user.id;
        }
      }
      return null;
    }
    const row = await this.prisma.authIdentity.findUnique({
      where: { provider_providerSubject: { provider, providerSubject: subject } },
    });
    return row?.userId ?? null;
  }

  async #findPasswordIdentity(
    email: string,
  ): Promise<{ userId: string; passwordHash: string | null } | null> {
    if (!this.prisma) {
      for (const user of this.#memoryUsers.values()) {
        if (user.identities.some((i) => i.provider === 'EMAIL_PASSWORD' && i.subject === email)) {
          return { userId: user.id, passwordHash: user.passwordHash };
        }
      }
      return null;
    }
    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerSubject: { provider: 'EMAIL_PASSWORD', providerSubject: email } },
    });
    if (!identity) return null;
    const cred = await this.prisma.customerCredential.findUnique({
      where: { userId: identity.userId },
    });
    return { userId: identity.userId, passwordHash: cred?.passwordHash ?? null };
  }

  async #findVerifiedEmailUser(email: string): Promise<string | null> {
    if (!this.prisma) {
      for (const user of this.#memoryUsers.values()) {
        if (user.emailNormalized === email && user.emailVerified) return user.id;
      }
      return null;
    }
    const row = await this.prisma.customerProfile.findFirst({
      where: { emailNormalized: email, emailVerified: true },
    });
    return row?.userId ?? null;
  }

  async #getCredential(userId: string): Promise<string | null> {
    if (!this.prisma) {
      return this.#memoryUsers.get(userId)?.passwordHash ?? null;
    }
    const row = await this.prisma.customerCredential.findUnique({ where: { userId } });
    return row?.passwordHash ?? null;
  }

  async #setCredential(userId: string, passwordHash: string): Promise<void> {
    if (!this.prisma) {
      const user = this.#memoryUsers.get(userId);
      if (user) user.passwordHash = passwordHash;
      return;
    }
    await this.prisma.customerCredential.upsert({
      where: { userId },
      create: {
        userId,
        passwordHash,
        passwordAlgo: 'scrypt',
        passwordUpdatedAt: new Date(),
      },
      update: { passwordHash, passwordAlgo: 'scrypt', passwordUpdatedAt: new Date() },
    });
  }

  async #emailForUser(userId: string): Promise<string | null> {
    if (!this.prisma) {
      return this.#memoryUsers.get(userId)?.emailNormalized ?? null;
    }
    const profile = await this.prisma.customerProfile.findUnique({ where: { userId } });
    return profile?.emailNormalized ?? null;
  }

  async #issueEmailVerification(userId: string, email: string): Promise<{ token: string }> {
    const token = generateRefreshToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    if (!this.prisma) {
      this.#emailTokens.set(tokenHash, { userId, email, expiresAt });
      return { token };
    }
    await this.prisma.emailVerificationChallenge.create({
      data: {
        userId,
        emailNormalized: email,
        tokenHash,
        expiresAt: new Date(expiresAt),
      },
    });
    return { token };
  }

  #adapter(code: OAuthProviderCode): OAuthProviderAdapter | undefined {
    return this.#oauth.find((a) => a.code === code);
  }

  #exposeDevToken(token: string): string | undefined {
    const env = getAppConfig().NODE_ENV;
    return env === 'test' ? token : undefined;
  }
}
