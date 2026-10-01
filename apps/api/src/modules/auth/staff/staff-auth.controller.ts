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

import { AccountStatusGuard } from '../guards/account-status.guard.js';
import { AuthGuard } from '../guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../guards/authenticated-principal.js';

import { StaffAuthService } from './staff-auth.service.js';

const STAFF_REFRESH_COOKIE = 'ff_courier_refresh';
const STAFF_MFA_COOKIE = 'ff_courier_mfa';
const STAFF_COOKIE_PATH = '/api/v1/auth/staff';
const STAFF_MFA_COOKIE_PATH = `${STAFF_COOKIE_PATH}/mfa/verify`;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function isAllowedBrowserRequest(request: FastifyRequest): boolean {
  const rawOrigin = request.headers.origin;
  if (!rawOrigin) return false;
  let origin: string;
  try {
    origin = new URL(rawOrigin).origin;
  } catch {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Browser session origin is invalid.',
    });
  }
  const allowed = (process.env['API_CORS_ORIGINS'] ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!allowed.some((entry) => entry !== '*' && entry === origin)) {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Browser session origin is not allowed.',
    });
  }
  return true;
}

function isCourierWebRequest(request: FastifyRequest): boolean {
  if (!isAllowedBrowserRequest(request)) return false;
  const origin = request.headers.origin;
  if (!origin) return false;
  const courierWebOrigin = process.env['COURIER_WEB_ORIGIN'] ?? 'http://localhost:3102';
  try {
    return new URL(origin).origin === new URL(courierWebOrigin).origin;
  } catch {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Courier Web session origin is invalid.',
    });
  }
}

function readCookie(request: FastifyRequest, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function sessionCookie(name: string, value: string, path: string, maxAge: number): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearCookie(name: string, path: string): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${name}=; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
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
          message: 'An active staff session is required.',
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
          message: 'One or more fields are invalid.',
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
          message: 'Email verification is invalid, expired, or already used.',
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
    const browserSession = isCourierWebRequest(request);
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
          message: 'One or more fields are invalid.',
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
          message: 'Staff login failed.',
          details: { reason: result.reason },
          requestId: REQUEST_ID,
        },
      };
    }
    if (browserSession) {
      reply.header(
        'Set-Cookie',
        sessionCookie(STAFF_MFA_COOKIE, result.refreshToken, STAFF_MFA_COOKIE_PATH, 10 * 60),
      );
      return {
        data: {
          userId: result.userId,
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
    const browserSession = isCourierWebRequest(request);
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
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const refreshToken = browserSession
      ? readCookie(request, STAFF_MFA_COOKIE)
      : parsed.data.refreshToken;
    if (!refreshToken) {
      reply.status(401);
      return {
        error: {
          code: ErrorCodes.AUTH_SESSION_EXPIRED,
          message: 'Sign-in challenge expired. Start again.',
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
          message: 'MFA verification failed.',
          details: { reason: result.reason },
          requestId: REQUEST_ID,
        },
      };
    }
    if (browserSession) {
      reply.header('Set-Cookie', [
        sessionCookie(
          STAFF_REFRESH_COOKIE,
          refreshToken,
          STAFF_COOKIE_PATH,
          SESSION_MAX_AGE_SECONDS,
        ),
        clearCookie(STAFF_MFA_COOKIE, STAFF_MFA_COOKIE_PATH),
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
    const browserSession = isCourierWebRequest(request);
    if (!browserSession) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'Staff refresh requires the MFA-established browser session cookie.',
      });
    }
    const parsed = safeValidate(
      z.object({}),
      body,
    );
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const refreshToken = readCookie(request, STAFF_REFRESH_COOKIE);
    if (!refreshToken) {
      reply.status(401);
      return {
        error: {
          code: ErrorCodes.AUTH_SESSION_EXPIRED,
          message: 'Session expired. Sign in again.',
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
          message: 'Session expired. Sign in again.',
          details: { reason: result.reason },
          requestId: REQUEST_ID,
        },
      };
    }
    reply.header(
      'Set-Cookie',
      sessionCookie(
        STAFF_REFRESH_COOKIE,
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
    const browserSession = isCourierWebRequest(request);
    const parsed = safeValidate(
      z.object({ refreshToken: refreshTokenSchema.optional() }),
      body,
    );
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const refreshToken = browserSession
      ? readCookie(request, STAFF_REFRESH_COOKIE)
      : parsed.data.refreshToken;
    if (refreshToken) await this.service.logout(refreshToken);
    if (browserSession) {
      reply.header('Set-Cookie', [
        clearCookie(STAFF_REFRESH_COOKIE, STAFF_COOKIE_PATH),
        clearCookie(STAFF_MFA_COOKIE, STAFF_MFA_COOKIE_PATH),
      ]);
    }
    return { data: { ok: true }, meta: { requestId: REQUEST_ID } };
  }
}
