import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { z } from 'zod';

import { PaymentService } from './payment.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const providerEventSchema = z.object({
  providerPaymentId: z.string().min(1).max(128),
  status: z.enum(['PAID', 'FAILED', 'PENDING']).optional(),
  token: z.string().optional(),
});

@Controller({ path: 'integrations/iyzico' })
export class IyzicoIntegrationController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  @Post('callback')
  @HttpCode(200)
  async callback(@Body() body: unknown): Promise<unknown> {
    return this.handleProviderEvent(body);
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
    const status = parsed.data.status ?? 'PAID';
    const attempt = await this.payments.applyProviderStatus(parsed.data.providerPaymentId, status);
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
      attempt.status === 'PAID' ? await this.payments.resolveOrderId(attempt.checkoutSessionId) : null;
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
