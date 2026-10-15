import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import { Body, Controller, Get, HttpCode, Inject, Injectable, Param, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CustomerAuthService } from '../auth/customer/customer-auth.service.js';
import { resolveStorefrontPrincipal } from '../auth/customer/request-identity.js';
import { CartService } from '../cart/cart.service.js';

import { CheckoutService, type FulfillmentMode } from './checkout.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const quoteSchema = z.object({
  fulfillmentMode: z.enum(['DELIVERY', 'PICKUP']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  pickupBranchId: z.string().uuid().optional(),
  deliveryBranchId: z.string().uuid().optional(),
  couponCode: z.string().min(1).max(64).optional(),
  loyaltyRequestedMinor: z.string().regex(/^\d+$/).optional(),
  loyaltyAvailablePoints: z.string().regex(/^\d+$/).optional(),
  tipMinor: z.string().regex(/^\d+$/).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  ecoPackaging: z.boolean().optional(),
  contactless: z.boolean().optional(),
  buildingAccessCode: z.string().max(64).nullable().optional(),
  deliveryNote: z.string().max(512).nullable().optional(),
  guestName: z.string().max(120).nullable().optional(),
  guestPhone: z.string().max(32).nullable().optional(),
  checkoutSessionId: z.string().uuid().optional(),
  addressLabel: z.string().max(255).nullable().optional(),
  /** Ignored — server remains price authority. */
  deliveryFeeMinor: z.string().regex(/^\d+$/).optional(),
  minimumOrderMinor: z.string().regex(/^\d+$/).optional(),
  cartDiscountMinor: z.string().regex(/^\d+$/).optional(),
});

const slotsQuery = z.object({
  branchId: z.string().uuid(),
  fulfillmentMode: z.enum(['DELIVERY', 'PICKUP']).optional(),
});

@Injectable()
@Controller({ path: 'checkout' })
export class CheckoutController {
  constructor(
    @Inject(CartService) private readonly cartService: CartService,
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
    @Inject(CustomerAuthService) private readonly customerAuth: CustomerAuthService,
  ) {}

  @Get('payment-methods')
  async paymentMethods(): Promise<unknown> {
    return {
      data: this.checkout.paymentMethods(),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('slots')
  async slots(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(slotsQuery, query ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'branchId is required.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    return {
      data: await this.checkout.listSlots(parsed.data.branchId),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('orders/:orderId')
  async confirmation(
    @Req() req: FastifyRequest,
    @Param('orderId') orderId: string,
  ): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const owned = await this.checkout.getOwnedOrder(orderId, principal);
    if (!owned) {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Order not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    const { order, branch, session } = owned;
    return {
      data: {
        id: order.id,
        status: order.status,
        checkoutSessionId: order.checkoutSessionId,
        currency: order.currency,
        fulfillmentMode: order.fulfillmentMode,
        scheduledFor: order.scheduledFor?.toISOString() ?? null,
        tipMinor: order.tipMinor.toString(),
        pickupDiscountMinor: order.pickupDiscountMinor.toString(),
        ecoPackaging: order.ecoPackaging,
        contactless: order.contactless,
        buildingAccessCode: order.buildingAccessCode,
        deliveryNote: order.deliveryNote,
        merchandiseNetMinor: order.merchandiseNetMinor.toString(),
        deliveryFeeMinor: order.deliveryFeeMinor.toString(),
        loyaltyRedeemedMinor: order.loyaltyRedeemedMinor.toString(),
        finalPayableMinor: order.finalPayableMinor.toString(),
        deliveryAddress: order.deliveryAddressJson,
        branch: branch
          ? {
              id: branch.id,
              name: branch.name,
              addressLine: branch.addressLine,
              etaMinutesMin: branch.estimatedDeliveryMinutesMin,
              etaMinutesMax: branch.estimatedDeliveryMinutesMax,
            }
          : null,
        items: order.items.map((item) => ({
          ...item,
          unitPriceMinorSnapshot: item.unitPriceMinorSnapshot.toString(),
          lineGrossMinorSnapshot: item.lineGrossMinorSnapshot.toString(),
          modifiers: item.modifiers.map((m) => ({
            ...m,
            priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot.toString(),
          })),
        })),
        guestName: session?.guestName ?? null,
        createdAt: order.createdAt.toISOString(),
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('quote')
  @HttpCode(200)
  async quote(@Req() req: FastifyRequest, @Body() body: unknown): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const cart =
      (principal.userId
        ? await this.cartService.resolveCart({ userId: principal.userId })
        : null) ??
      (principal.guestSessionId
        ? await this.cartService.resolveCart({ guestSessionId: principal.guestSessionId })
        : null);
    if (!cart) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'A customer session or guest session is required, and a cart must exist.',
          requestId: REQUEST_ID,
        },
      };
    }
    const parsed = safeValidate(quoteSchema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more checkout fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const mode: FulfillmentMode = parsed.data.fulfillmentMode === 'PICKUP' ? 'PICKUP' : 'DELIVERY';
    const result = await this.checkout.quote(cart, principal, {
      fulfillmentMode: mode,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      pickupBranchId: parsed.data.pickupBranchId,
      deliveryBranchId: parsed.data.deliveryBranchId,
      couponCode: parsed.data.couponCode,
      loyaltyRequestedMinor: parsed.data.loyaltyRequestedMinor
        ? BigInt(parsed.data.loyaltyRequestedMinor)
        : undefined,
      loyaltyAvailablePoints: parsed.data.loyaltyAvailablePoints
        ? BigInt(parsed.data.loyaltyAvailablePoints)
        : undefined,
      tipMinor: parsed.data.tipMinor ? BigInt(parsed.data.tipMinor) : undefined,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
      ecoPackaging: parsed.data.ecoPackaging,
      contactless: parsed.data.contactless,
      buildingAccessCode: parsed.data.buildingAccessCode,
      deliveryNote: parsed.data.deliveryNote,
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone,
      checkoutSessionId: parsed.data.checkoutSessionId,
      addressLabel: parsed.data.addressLabel,
    });
    if (!result.ok) {
      return {
        error: {
          code: result.code,
          message: result.message,
          requestId: REQUEST_ID,
        },
      };
    }
    return { data: result.quote, meta: { requestId: REQUEST_ID } };
  }
}
