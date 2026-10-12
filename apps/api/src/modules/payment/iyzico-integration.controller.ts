import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import { Body, Controller, HttpCode, Inject, Post, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';

import { getAppConfig } from '../../bootstrap/app-config.js';

import { PaymentService, type CheckoutPaymentRecord } from './payment.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const MOBILE_RETURN_URL = 'fastfoodcustomer://payment/return';

const providerEventSchema = z.object({
  providerPaymentId: z.string().min(1).max(128).optional(),
  status: z.enum(['PAID', 'FAILED', 'PENDING']).optional(),
  token: z.string().min(1).max(128).optional(),
});

@Controller({ path: 'integrations/iyzico' })
export class IyzicoIntegrationController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  /**
   * Browser return from the iyzico Checkout Form (form POST with `token`).
   * ADR-022: the result is verified with iyzico, then the customer is sent
   * back to the storefront or the mobile app, which read checkout/status.
   */
  @Post('callback')
  @HttpCode(200)
  async callback(
    @Body() body: unknown,
    @Query('channel') channel: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const parsed = safeValidate(providerEventSchema, body ?? {});
    if (this.payments.acceptsClientAssertedStatus || !parsed.ok) {
      return this.handleProviderEvent(body);
    }
    const token = parsed.data.token ?? parsed.data.providerPaymentId;
    const attempt = token ? await this.payments.verifyByProviderPaymentId(token) : null;
    if (!attempt) {
      reply.status(404);
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Payment attempt not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    const target =
      channel === 'mobile'
        ? `${MOBILE_RETURN_URL}?checkoutId=${attempt.checkoutSessionId}`
        : `${getAppConfig().STOREFRONT_PUBLIC_URL.replace(/\/$/, '')}/payment/${attempt.checkoutSessionId}`;
    reply.status(303).header('Location', target);
    return { data: { checkoutSessionId: attempt.checkoutSessionId, status: attempt.status } };
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: unknown): Promise<unknown> {
    return this.handleProviderEvent(body);
  }

  private async handleProviderEvent(body: unknown): Promise<unknown> {
    const parsed = safeValidate(providerEventSchema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid provider payload.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const providerPaymentId = parsed.data.providerPaymentId ?? parsed.data.token;
    if (!providerPaymentId) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid provider payload.',
          details: { fields: [{ path: 'providerPaymentId', message: 'Required' }] },
          requestId: REQUEST_ID,
        },
      };
    }
    // ADR-022: only the simulated gateway trusts a client-asserted status; the
    // iyzico gateway re-verifies with iyzico and ignores `status`.
    const attempt: CheckoutPaymentRecord | null = this.payments.acceptsClientAssertedStatus
      ? await this.payments.applyProviderStatus(providerPaymentId, parsed.data.status ?? 'PAID')
      : await this.payments.verifyByProviderPaymentId(providerPaymentId);
    if (!attempt) {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Payment attempt not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    const orderId =
      attempt.status === 'PAID'
        ? await this.payments.resolveOrderId(attempt.checkoutSessionId)
        : null;
    return {
      data: {
        paymentId: attempt.id,
        checkoutSessionId: attempt.checkoutSessionId,
        status: attempt.status,
        providerPaymentId: attempt.providerPaymentId,
        orderId,
      },
      meta: { requestId: REQUEST_ID },
    };
  }
}
