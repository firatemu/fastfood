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
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CustomerAuthService } from '../auth/customer/customer-auth.service.js';
import { resolveStorefrontPrincipal } from '../auth/customer/request-identity.js';
import { CartService } from '../cart/cart.service.js';
import { CheckoutService } from '../checkout/checkout.service.js';

import { PaymentService } from './payment.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const initializeSchema = z.object({
  checkoutSessionId: z.string().uuid(),
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3).optional(),
  idempotencyKey: z.string().min(8).max(128),
  paymentMethodCode: z.string().min(1).max(32).optional(),
});

@Injectable()
@Controller({ path: 'checkout' })
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly payments: PaymentService,
    @Inject(CartService) private readonly carts: CartService,
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
    @Inject(CustomerAuthService) private readonly customerAuth: CustomerAuthService,
  ) {}

  @Post('payment/initialize')
  @HttpCode(201)
  async initialize(@Req() req: FastifyRequest, @Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(initializeSchema, body);
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

    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const cart =
      (principal.userId ? await this.carts.resolveCart({ userId: principal.userId }) : null) ??
      (principal.guestSessionId
        ? await this.carts.resolveCart({ guestSessionId: principal.guestSessionId })
        : null);
    if (!cart?.branchId) {
      return {
        error: {
          code: ErrorCodes.ADDRESS_NOT_SERVICEABLE,
          message:
            'Checkout quote with a serviceable delivery location is required before payment initialization.',
          requestId: REQUEST_ID,
        },
      };
    }

    const method = parsed.data.paymentMethodCode ?? 'iyzico_hosted';
    if (method !== 'iyzico_hosted') {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Selected payment method is not available.',
          requestId: REQUEST_ID,
        },
      };
    }

    const session = await this.checkout.getSession(parsed.data.checkoutSessionId);
    if (session) {
      const eligible = session.quoteSnapshotJson?.minimumOrderEligible;
      if (eligible === false) {
        return {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Minimum order amount is not met.',
            requestId: REQUEST_ID,
          },
        };
      }
      if (session.finalPayableMinor !== BigInt(parsed.data.amountMinor)) {
        return {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Payment amount does not match the authoritative checkout quote.',
            requestId: REQUEST_ID,
          },
        };
      }
    }

    const result = await this.payments.initialize({
      checkoutSessionId: parsed.data.checkoutSessionId,
      amountMinor: session?.finalPayableMinor ?? BigInt(parsed.data.amountMinor),
      currency: parsed.data.currency ?? session?.currency ?? 'TRY',
      idempotencyKey: parsed.data.idempotencyKey,
      buyerUserId: principal.userId,
    });
    return {
      data: {
        attemptId: result.attempt.id,
        checkoutSessionId: result.attempt.checkoutSessionId,
        provider: result.provider.provider,
        providerPaymentId: result.provider.providerPaymentId,
        status: result.provider.status,
        redirectUrl: result.provider.redirectUrl,
        amountMinor: result.attempt.amountMinor.toString(),
        currency: result.attempt.currency,
        branchId: cart.branchId,
        replayed: result.replayed,
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('status/:checkoutId')
  async status(@Param('checkoutId') checkoutId: string): Promise<unknown> {
    const attempt = await this.payments.refreshStatus(checkoutId);
    if (!attempt) {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Checkout payment attempt not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    const orderId =
      attempt.status === 'PAID' ? await this.payments.resolveOrderId(attempt.checkoutSessionId) : null;
    return {
      data: {
        checkoutSessionId: attempt.checkoutSessionId,
        attemptId: attempt.id,
        providerPaymentId: attempt.providerPaymentId,
        status: attempt.status,
        amountMinor: attempt.amountMinor.toString(),
        currency: attempt.currency,
        orderId,
      },
      meta: { requestId: REQUEST_ID },
    };
  }
}
