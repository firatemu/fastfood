import { createPrivateKey, sign } from 'node:crypto';

import { getAppConfig } from '../../../bootstrap/app-config.js';

export type OAuthProviderCode = 'google' | 'apple';

export interface OAuthProfile {
  subject: string;
  emailNormalized?: string;
  emailVerifiedByProvider: boolean;
}

export interface OAuthProviderAdapter {
  readonly code: OAuthProviderCode;
  isConfigured(): boolean;
  authorizationUrl(state: string, redirectUri: string): string;
  exchangeAuthorizationCode(code: string, redirectUri: string): Promise<OAuthProfile>;
}

function configured(...values: string[]): boolean {
  return values.every((v) => v.trim().length > 0);
}

export class GoogleOAuthAdapter implements OAuthProviderAdapter {
  readonly code = 'google' as const;

  isConfigured(): boolean {
    const cfg = getAppConfig();
    return configured(cfg.GOOGLE_OAUTH_CLIENT_ID, cfg.GOOGLE_OAUTH_CLIENT_SECRET, cfg.GOOGLE_OAUTH_REDIRECT_URI);
  }

  authorizationUrl(state: string, redirectUri: string): string {
    const cfg = getAppConfig();
    const params = new URLSearchParams({
      client_id: cfg.GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce: state.slice(0, 32),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeAuthorizationCode(code: string, redirectUri: string): Promise<OAuthProfile> {
    const cfg = getAppConfig();
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: cfg.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      throw new Error('OAUTH_EXCHANGE_FAILED');
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      throw new Error('OAUTH_EXCHANGE_FAILED');
    }
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      throw new Error('OAUTH_PROFILE_FAILED');
    }
    const profile = (await userRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };
    if (!profile.sub) {
      throw new Error('OAUTH_PROFILE_FAILED');
    }
    return {
      subject: profile.sub,
      emailNormalized: profile.email?.trim().toLowerCase() || undefined,
      emailVerifiedByProvider: profile.email_verified === true,
    };
  }
}

function appleClientSecret(): string {
  const cfg = getAppConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: cfg.APPLE_OAUTH_KEY_ID }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: cfg.APPLE_OAUTH_TEAM_ID,
      iat: now,
      exp: now + 3600,
      aud: 'https://appleid.apple.com',
      sub: cfg.APPLE_OAUTH_CLIENT_ID,
    }),
  ).toString('base64url');
  const key = createPrivateKey(cfg.APPLE_OAUTH_PRIVATE_KEY.replace(/\\n/g, '\n'));
  const sig = sign('SHA256', Buffer.from(`${header}.${payload}`), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${payload}.${sig.toString('base64url')}`;
}

export class AppleOAuthAdapter implements OAuthProviderAdapter {
  readonly code = 'apple' as const;

  isConfigured(): boolean {
    const cfg = getAppConfig();
    return configured(
      cfg.APPLE_OAUTH_CLIENT_ID,
      cfg.APPLE_OAUTH_TEAM_ID,
      cfg.APPLE_OAUTH_KEY_ID,
      cfg.APPLE_OAUTH_PRIVATE_KEY,
      cfg.APPLE_OAUTH_REDIRECT_URI,
    );
  }

  authorizationUrl(state: string, redirectUri: string): string {
    const cfg = getAppConfig();
    const params = new URLSearchParams({
      client_id: cfg.APPLE_OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: 'name email',
      state,
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async exchangeAuthorizationCode(code: string, redirectUri: string): Promise<OAuthProfile> {
    const cfg = getAppConfig();
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.APPLE_OAUTH_CLIENT_ID,
        client_secret: appleClientSecret(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      throw new Error('OAUTH_EXCHANGE_FAILED');
    }
    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (!tokenJson.id_token) {
      throw new Error('OAUTH_EXCHANGE_FAILED');
    }
    const payloadPart = tokenJson.id_token.split('.')[1];
    if (!payloadPart) {
      throw new Error('OAUTH_PROFILE_FAILED');
    }
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
    };
    if (!payload.sub) {
      throw new Error('OAUTH_PROFILE_FAILED');
    }
    return {
      subject: payload.sub,
      emailNormalized: payload.email?.trim().toLowerCase() || undefined,
      emailVerifiedByProvider:
        payload.email_verified === true || payload.email_verified === 'true',
    };
  }
}

/** Test-only adapter. Application login never short-circuits to success. */
export class FakeOAuthAdapter implements OAuthProviderAdapter {
  constructor(
    readonly code: OAuthProviderCode,
    private readonly profiles: Map<string, OAuthProfile>,
    private readonly configured = true,
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  authorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({ state, redirect_uri: redirectUri });
    return `https://oauth.test/${this.code}/authorize?${params.toString()}`;
  }

  async exchangeAuthorizationCode(code: string): Promise<OAuthProfile> {
    const profile = this.profiles.get(code);
    if (!profile) {
      throw new Error('OAUTH_DENIED');
    }
    return profile;
  }
}

export function createDefaultOAuthAdapters(): OAuthProviderAdapter[] {
  return [new GoogleOAuthAdapter(), new AppleOAuthAdapter()];
}
