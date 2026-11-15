import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import {
  clearCookie,
  isAllowedBrowserRequest,
  readCookie,
  sessionCookie,
} from '../browser-session.js';
import { AccountStatusGuard } from '../guards/account-status.guard.js';
import { AuthGuard } from '../guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../guards/authenticated-principal.js';

import { StaffAuthService } from './staff-auth.service.js';

const STAFF_COOKIE_PATH = '/api/v1/auth/staff';
const STAFF_MFA_COOKIE_PATH = `${STAFF_COOKIE_PATH}/mfa/verify`;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Staff browser sessions are split into two cookie families.
 *
 * The API host serves both staff consoles, so a single cookie name would let
 * one console refresh the other's session (production-readiness audit P0-3).
 * The family is chosen from the request origin, and each family owns its own
 * refresh and MFA cookie names.
 */
const STAFF_COOKIE_FAMILIES = {
  courier: { refresh: 'ff_courier_refresh', mfa: 'ff_courier_mfa' },
  admin: { refresh: 'ff_staff_refresh', mfa: 'ff_staff_mfa' },
} as const;

type StaffCookieFamily = (typeof STAFF_COOKIE_FAMILIES)[keyof typeof STAFF_COOKIE_FAMILIES];

const LOCAL_DEV_COURIER_ORIGINS = [
  'http://localhost:3102',
  'http://127.0.0.1:3102',
  'http://kurye.fastfood.localhost',
  'http://kurye.fastfood.localhost:3102',
] as const;

const LOCAL_DEV_ADMIN_ORIGINS = [
  'http://localhost:3101',
  'http://127.0.0.1:3101',
  'http://admin.fastfood.localhost',
  'http://admin.fastfood.localhost:3101',
] as const;

function originOf(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function configuredOrigins(raw: string | undefined, devAliases: readonly string[]): Set<string> {
  const origins = new Set<string>();
  for (const part of (raw ?? '').split(',')) {
    const parsed = originOf(part.trim());
    if (parsed) origins.add(parsed);
  }
  if (process.env['NODE_ENV'] !== 'production') {
    for (const alias of devAliases) origins.add(alias);
  }
  return origins;
}

/**
 * Resolve the browser-session cookie family of the request.
 *
 * `null` means "not a staff browser console": native clients (courier-mobile)
 * keep their refresh credential in the platform secure store and send it in
 * the request body.
 */
function staffCookieFamily(request: FastifyRequest): StaffCookieFamily | null {
  if (!isAllowedBrowserRequest(request)) return null;
  const rawOrigin = request.headers.origin;
  if (!rawOrigin) return null;
  const origin = originOf(rawOrigin);
  if (!origin) {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Personel oturum kaynağı (Origin) geçersiz.',
    });
  }
  const courierOrigins = configuredOrigins(
    process.env['COURIER_WEB_ORIGIN'],
    LOCAL_DEV_COURIER_ORIGINS,
  );
  const adminOrigins = configuredOrigins(
    process.env['ADMIN_WEB_ORIGIN'],
    LOCAL_DEV_ADMIN_ORIGINS,
  );
  if (courierOrigins.has(origin)) return STAFF_COOKIE_FAMILIES.courier;
  if (adminOrigins.has(origin)) return STAFF_COOKIE_FAMILIES.admin;
  return null;
}

/**
 * Staff auth endpoints (document 07 §4 + 29).
 *
 * Phase 3 ships:
 *   - POST /api/v1/auth/staff/login
 *   - POST /api/v1/auth/staff/mfa/verify (development-mode bypass
 *     controlled by `ALLOW_DEV_MFA_BYPASS=true` + NODE_ENV!=production;
 *     production TOTP verification is deferred to Phase 10).
 *
 * Refresh / logout / sessions endpoints reuse the customer service
 * surface because the document 44 §3 model is shared between both
 * actor types.
 */

const identifierSchema = z.string().min(1).max(255);
const passwordSchema = z.string().min(1).max(1024);
const totpSchema = z.string().regex(/^\d{6}$/);
const refreshTokenSchema = z.string().min(1).max(256);
const verificationTokenSchema = z.string().min(32).max(256);
const emailConfirmSchema = z.object({ token: verificationTokenSchema });

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

@Injectable()
@Controller({ path: 'auth/staff' })
export class StaffAuthController {
  constructor(@Inject(StaffAuthService) private readonly service: StaffAuthService) {}

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Get('me')
  async me(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = request.principal;
    if (!principal || principal.actorType !== 'STAFF') {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Aktif bir personel oturumu gereklidir.',
          requestId: REQUEST_ID,
        },
      };
    }
    return {
      data: {
        userId: principal.id,
        permissions: [...principal.permissions].sort(),
        branchIds: [...(principal.branchIds ?? [])],
        isSuperAdmin: Boolean(principal.isSuperAdmin),
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('email/confirm')
  @HttpCode(200)
  async confirmEmailChange(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(emailConfirmSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Girilen alanlardan biri veya birkaçı geçersiz.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const result = await this.service.confirmEmailChange(parsed.data.token);
    if (!result) {
      return {
        error: {
          code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
          message:
            'E-posta doğrulama bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış.',
          requestId: REQUEST_ID,
        },
      };
    }
    return { data: result, meta: { requestId: REQUEST_ID } };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const browserSession = staffCookieFamily(request);
    const parsed = safeValidate(
      z.object({
        identifier: identifierSchema,
        password: passwordSchema,
      }),
      body,
    );
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Lütfen kullanıcı adı/e-posta ve şifre alanlarını kontrol edin.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const result = await this.service.login(parsed.data.identifier, parsed.data.password);
    if (!result.ok) {
      reply.status(401);
      return {
        error: {
          code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
          message: 'Kullanıcı adı/e-posta veya şifre hatalı.',
          details: { reason: result.reason },
          requestId: REQUEST_ID,
        },
      };
    }
    if (browserSession) {
      reply.header(
        'Set-Cookie',
        sessionCookie(browserSession.mfa, result.refreshToken, STAFF_MFA_COOKIE_PATH, 10 * 60),
      );
      return {
        data: {
          userId: result.userId,
          ...(!result.mfaRequired ? { refreshToken: result.refreshToken } : {}),
          refreshExpiresAt: result.refreshExpiresAt.toISOString(),
          mfaRequired: result.mfaRequired,
        },
        meta: { requestId: REQUEST_ID },
      };
    }
    return {
      data: {
        userId: result.userId,
        refreshToken: result.refreshToken,
        refreshExpiresAt: result.refreshExpiresAt.toISOString(),
        mfaRequired: result.mfaRequired,
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('mfa/verify')
  @HttpCode(200)
  async mfaVerify(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const browserSession = staffCookieFamily(request);
    const parsed = safeValidate(
      z.object({
        refreshToken: refreshTokenSchema.optional(),
        totp: totpSchema,
      }),
      body,
    );
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Doğrulama kodu 6 haneli olmalıdır.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const refreshToken =
      (browserSession ? readCookie(request, browserSession.mfa) : undefined) ??
      parsed.data.refreshToken;
    if (!refreshToken) {
      reply.status(401);
      return {
        error: {
          code: ErrorCodes.AUTH_SESSION_EXPIRED,
          message: 'Giriş doğrulama süresi doldu. Lütfen tekrar giriş yapın.',
          requestId: REQUEST_ID,
        },
      };
    }
    const result = await this.service.verifyMfa(refreshToken, parsed.data.totp);
    if (!result.ok) {
      reply.status(401);
      return {
        error: {
          code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
          message: 'Doğrulama kodu hatalı veya süresi dolmuş.',
          details: { reason: result.reason },
          requestId: REQUEST_ID,
        },
      };
    }
    if (browserSession) {
      reply.header('Set-Cookie', [
        sessionCookie(
          browserSession.refresh,
          refreshToken,
          STAFF_COOKIE_PATH,
          SESSION_MAX_AGE_SECONDS,
        ),
        clearCookie(browserSession.mfa, STAFF_MFA_COOKIE_PATH),
      ]);
    }
    return {
      data: {
        userId: result.userId,
        accessToken: result.accessToken,
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const browserSession = staffCookieFamily(request);
    if (!browserSession) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'Oturum yenileme için geçerli tarayıcı oturumu gereklidir.',
      });
    }
    const parsed = safeValidate(z.object({}), body);
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Girilen alanlardan biri veya birkaçı geçersiz.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const refreshToken = readCookie(request, browserSession.refresh);
    if (!refreshToken) {
      reply.status(401);
      return {
        error: {
          code: ErrorCodes.AUTH_SESSION_EXPIRED,
          message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
          requestId: REQUEST_ID,
        },
      };
    }
    const result = await this.service.refresh(refreshToken);
    if (!result.ok) {
      reply.status(401);
      return {
        error: {
          code: ErrorCodes.AUTH_SESSION_EXPIRED,
          message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
          details: { reason: result.reason },
          requestId: REQUEST_ID,
        },
      };
    }
    reply.header(
      'Set-Cookie',
      sessionCookie(
        browserSession.refresh,
        result.refreshToken,
        STAFF_COOKIE_PATH,
        SESSION_MAX_AGE_SECONDS,
      ),
    );
    return {
      data: {
        userId: result.userId,
        accessToken: result.accessToken,
        refreshExpiresAt: result.refreshExpiresAt.toISOString(),
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const browserSession = staffCookieFamily(request);
    const parsed = safeValidate(z.object({ refreshToken: refreshTokenSchema.optional() }), body);
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Girilen alanlardan biri veya birkaçı geçersiz.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const refreshToken = browserSession
      ? readCookie(request, browserSession.refresh)
      : parsed.data.refreshToken;
    if (refreshToken) await this.service.logout(refreshToken);
    if (browserSession) {
      reply.header('Set-Cookie', [
        clearCookie(browserSession.refresh, STAFF_COOKIE_PATH),
        clearCookie(browserSession.mfa, STAFF_MFA_COOKIE_PATH),
      ]);
    }
    return { data: { ok: true }, meta: { requestId: REQUEST_ID } };
  }
}
