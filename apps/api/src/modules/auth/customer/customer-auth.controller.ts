import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { getAppConfig } from '../../../bootstrap/app-config.js';
import { AuthGuard } from '../guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../guards/authenticated-principal.js';

import { CustomerAuthService, type OtpFailReason } from './customer-auth.service.js';
import type { OAuthProviderCode } from './oauth-providers.js';

const phoneNormalizedSchema = z
  .string()
  .regex(/^\+\d{10,15}$/, { message: 'Phone must be in E.164 normalized format (+xxxxxxxxxxxx).' });

const otpCodeSchema = z.string().regex(/^\d{6}$/);
const refreshTokenSchema = z.string().min(1).max(256);
const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(10).max(128);
const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

function envelope(data: unknown): unknown {
  return { data, meta: { requestId: REQUEST_ID } };
}

function error(code: string, message: string, details?: Record<string, unknown>): unknown {
  return { error: { code, message, details, requestId: REQUEST_ID } };
}

function otpMessage(reason: OtpFailReason): string {
  if (reason === 'OTP_EXPIRED') return 'OTP code expired.';
  if (reason === 'OTP_ATTEMPTS_EXHAUSTED') return 'Too many OTP attempts.';
  if (reason === 'OTP_COOLDOWN') return 'Please wait before requesting another code.';
  if (reason === 'OTP_SUSPENDED') {
    return 'Phone OTP is currently suspended per ADR-010. Use the phone + password registration endpoint.';
  }
  return 'OTP verification failed.';
}

@Injectable()
@Controller({ path: 'auth/customer' })
export class CustomerAuthController {
  constructor(@Inject(CustomerAuthService) private readonly service: CustomerAuthService) {}

  @Get('methods')
  methods(): unknown {
    return envelope(this.service.methods());
  }

  @Post('otp/request')
  @HttpCode(200)
  async otpRequest(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(z.object({ phoneNormalized: phoneNormalizedSchema }), body);
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.requestOtp(parsed.data.phoneNormalized);
    if (!result.ok) {
      return error(ErrorCodes.RATE_LIMITED, otpMessage(result.reason), {
        reason: result.reason,
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
    return envelope({ expiresAt: result.expiresAt.toISOString() });
  }

  @Post('otp/verify')
  @HttpCode(200)
  async otpVerify(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(
      z.object({
        phoneNormalized: phoneNormalizedSchema,
        code: otpCodeSchema,
        displayName: z.string().min(1).max(120).optional(),
      }),
      body,
    );
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.verifyOtp(
      parsed.data.phoneNormalized,
      parsed.data.code,
      parsed.data.displayName,
    );
    if (!result.ok) {
      return error(ErrorCodes.AUTH_INVALID_CREDENTIALS, otpMessage(result.reason), {
        reason: result.reason,
      });
    }
    return envelope({
      customerId: result.customerId,
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.refreshExpiresAt.toISOString(),
    });
  }

  @Post('register-phone')
  @HttpCode(200)
  async registerPhone(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const parsed = safeValidate(
      z.object({
        phoneNormalized: phoneNormalizedSchema,
        password: passwordSchema,
        displayName: z.string().min(1).max(120).optional(),
        kvkkAccepted: z.boolean(),
        newsletterOptIn: z.boolean().optional(),
      }),
      body,
    );
    if (!parsed.ok) {
      reply.status(400);
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.registerByPhoneAndPassword(parsed.data);
    if (!result.ok) {
      const conflict =
        result.reason === 'PHONE_ALREADY_REGISTERED' || result.reason === 'OTP_SUSPENDED';
      reply.status(conflict ? 409 : 400);
      const message =
        result.reason === 'PHONE_ALREADY_REGISTERED'
          ? 'Bu telefon numarasıyla zaten bir hesap var. Giriş yapmayı deneyin.'
          : result.reason === 'KVKK_REQUIRED'
            ? 'Üye olmak için KVKK onayını vermeniz gerekiyor.'
            : result.reason === 'PASSWORD_POLICY'
              ? 'Şifre kayıt koşullarını karşılamıyor.'
              : otpMessage('OTP_SUSPENDED');
      return error(ErrorCodes.VALIDATION_ERROR, message, { reason: result.reason });
    }
    return envelope({
      customerId: result.customerId,
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.refreshExpiresAt.toISOString(),
    });
  }

  @Post('password/register')
  @HttpCode(200)
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const parsed = safeValidate(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        displayName: z.string().min(1).max(120).optional(),
        kvkkAccepted: z.boolean(),
        newsletterOptIn: z.boolean().optional(),
      }),
      body,
    );
    if (!parsed.ok) {
      reply.status(400);
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.registerPassword(parsed.data);
    if (!result.ok) {
      const conflict = result.reason === 'EMAIL_TAKEN';
      reply.status(conflict ? 409 : 400);
      const message =
        result.reason === 'EMAIL_TAKEN'
          ? 'Bu e-posta adresiyle zaten bir hesap var.'
          : result.reason === 'KVKK_REQUIRED'
            ? 'Üye olmak için KVKK onayını vermeniz gerekiyor.'
            : 'Şifre kayıt koşullarını karşılamıyor.';
      return error(ErrorCodes.VALIDATION_ERROR, message, { reason: result.reason });
    }
    return envelope({
      customerId: result.customerId,
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.refreshExpiresAt.toISOString(),
    });
  }

  @Post('password/login')
  @HttpCode(200)
  async passwordLogin(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const parsed = safeValidate(
      z.object({
        identifier: z.string().trim().min(3).max(255),
        password: z.string().min(1).max(128),
      }),
      body,
    );
    if (!parsed.ok) {
      reply.status(400);
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.loginPassword(parsed.data.identifier, parsed.data.password);
    if (!result.ok) {
      const code =
        result.reason === 'RATE_LIMITED'
          ? ErrorCodes.RATE_LIMITED
          : ErrorCodes.AUTH_INVALID_CREDENTIALS;
      reply.status(result.reason === 'RATE_LIMITED' ? 429 : 401);
      return error(code, 'Login failed.', { reason: result.reason });
    }
    return envelope({
      customerId: result.customerId,
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.refreshExpiresAt.toISOString(),
    });
  }

  @Post('password/forgot')
  @HttpCode(200)
  async forgot(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(z.object({ email: emailSchema }), body);
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    await this.service.requestPasswordReset(parsed.data.email);
    return envelope({ ok: true });
  }

  @Post('password/reset')
  @HttpCode(200)
  async reset(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(
      z.object({ token: z.string().min(10).max(256), password: passwordSchema }),
      body,
    );
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.confirmPasswordReset(parsed.data.token, parsed.data.password);
    if (!result.ok) {
      return error(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Reset failed.', { reason: result.reason });
    }
    return envelope({ ok: true });
  }

  @UseGuards(AuthGuard)
  @Post('password/change')
  @HttpCode(200)
  async change(
    @Req()
    req: FastifyRequest & { principal?: AuthenticatedPrincipal; authenticatedUserId?: string },
    @Body() body: unknown,
  ): Promise<unknown> {
    const userId = req.principal?.id ?? req.authenticatedUserId;
    if (!userId) {
      return error(ErrorCodes.AUTH_UNAUTHENTICATED, 'Authentication is required.');
    }
    const parsed = safeValidate(
      z.object({ currentPassword: z.string().min(1).max(128), nextPassword: passwordSchema }),
      body,
    );
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.changePassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.nextPassword,
    );
    if (!result.ok) {
      return error(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Password change failed.', {
        reason: result.reason,
      });
    }
    return envelope({ ok: true });
  }

  @UseGuards(AuthGuard)
  @Post('password/create')
  @HttpCode(200)
  async createPassword(
    @Req()
    req: FastifyRequest & { principal?: AuthenticatedPrincipal; authenticatedUserId?: string },
    @Body() body: unknown,
  ): Promise<unknown> {
    const userId = req.principal?.id ?? req.authenticatedUserId;
    if (!userId) {
      return error(ErrorCodes.AUTH_UNAUTHENTICATED, 'Authentication is required.');
    }
    const parsed = safeValidate(z.object({ password: passwordSchema }), body);
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.createPassword(userId, parsed.data.password);
    if (!result.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'Password create failed.', {
        reason: result.reason,
      });
    }
    return envelope({ ok: true });
  }

  @UseGuards(AuthGuard)
  @Post('email/verify/request')
  @HttpCode(200)
  async requestEmailVerify(
    @Req()
    req: FastifyRequest & { principal?: AuthenticatedPrincipal; authenticatedUserId?: string },
  ): Promise<unknown> {
    const userId = req.principal?.id ?? req.authenticatedUserId;
    if (!userId) {
      return error(ErrorCodes.AUTH_UNAUTHENTICATED, 'Authentication is required.');
    }
    const result = await this.service.requestEmailVerification(userId);
    if (!result.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'No email on this account.');
    }
    return envelope({ ok: true });
  }

  @Post('email/verify')
  @HttpCode(200)
  async verifyEmail(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(z.object({ token: z.string().min(10).max(256) }), body);
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.confirmEmailVerification(parsed.data.token);
    if (!result.ok) {
      return error(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Verification failed.', {
        reason: result.reason,
      });
    }
    return envelope({ ok: true, customerId: result.customerId });
  }

  @Get('oauth/:provider/start')
  startOAuth(
    @Param('provider') providerRaw: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: FastifyRequest & { authenticatedUserId?: string },
  ): unknown {
    const provider = this.#provider(providerRaw);
    if (!provider) {
      return error(ErrorCodes.VALIDATION_ERROR, 'Unknown OAuth provider.');
    }
    const result = this.service.startOAuth(
      provider,
      query.returnTo ?? '/account',
      req.authenticatedUserId,
    );
    if (!result.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'OAuth is not configured.', {
        reason: result.reason,
      });
    }
    return envelope({ authorizationUrl: result.authorizationUrl, configured: true });
  }

  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') providerRaw: string,
    @Query() query: Record<string, string | undefined>,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const origin = getAppConfig().STOREFRONT_PUBLIC_URL.replace(/\/$/, '');
    const provider = this.#provider(providerRaw);
    if (!provider) {
      await reply.redirect(`${origin}/auth?error=oauth_failed`);
      return;
    }
    const result = await this.service.completeOAuth(provider, {
      code: query.code,
      state: query.state,
      error: query.error,
    });
    if (!result.ok) {
      const err =
        result.reason === 'OAUTH_CANCELLED'
          ? 'oauth_cancelled'
          : result.reason === 'OAUTH_UNAVAILABLE'
            ? 'oauth_unavailable'
            : 'oauth_failed';
      await reply.redirect(
        `${origin}/auth?error=${err}&next=${encodeURIComponent(result.returnTo)}`,
      );
      return;
    }
    const params = new URLSearchParams({
      customerId: result.customerId,
      refreshToken: result.refreshToken,
      next: result.returnTo,
    });
    await reply.redirect(`${origin}/auth/callback?${params.toString()}`);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(z.object({ refreshToken: refreshTokenSchema }), body);
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    const result = await this.service.refresh(parsed.data.refreshToken);
    if (!result.ok) {
      return error(
        result.reason === 'TOKEN_MALFORMED'
          ? ErrorCodes.VALIDATION_ERROR
          : ErrorCodes.AUTH_SESSION_EXPIRED,
        'Refresh failed.',
        { reason: result.reason },
      );
    }
    return envelope({
      customerId: result.customerId,
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.refreshExpiresAt.toISOString(),
    });
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(z.object({ refreshToken: refreshTokenSchema }), body);
    if (!parsed.ok) {
      return error(ErrorCodes.VALIDATION_ERROR, 'One or more fields are invalid.', {
        fields: parsed.issues,
      });
    }
    await this.service.logout(parsed.data.refreshToken);
    return envelope({ ok: true });
  }

  @UseGuards(AuthGuard)
  @Get('identities')
  async identities(
    @Req()
    req: FastifyRequest & { principal?: AuthenticatedPrincipal; authenticatedUserId?: string },
  ): Promise<unknown> {
    const userId = req.principal?.id ?? req.authenticatedUserId;
    if (!userId) {
      return error(ErrorCodes.AUTH_UNAUTHENTICATED, 'Authentication is required.');
    }
    return envelope(await this.service.linkedMethods(userId));
  }

  #provider(raw: string): OAuthProviderCode | null {
    if (raw === 'google' || raw === 'apple') return raw;
    return null;
  }
}
