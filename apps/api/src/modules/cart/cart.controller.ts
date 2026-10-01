import { ErrorCodes } from '@fastfood/contracts';
import { ActorType } from '@fastfood/domain-types';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CustomerAuthService } from '../auth/customer/customer-auth.service.js';
import { resolveStorefrontPrincipal } from '../auth/customer/request-identity.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { CatalogService } from '../catalog/catalog.service.js';

import { CartPricingService } from './cart-pricing.service.js';
import { CartValidationService } from './cart-validation.service.js';
import { CartService, type AddCartLineInput, type UpdateCartLineInput } from './cart.service.js';
import { CartOwnershipPolicy } from './policies/cart-ownership.policy.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const addLineSchema = z.object({
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  unitPriceMinorSnapshot: z.string().regex(/^\d+$/).optional(),
  currencySnapshot: z.string().length(3).optional(),
  deliveryNote: z.string().max(512).optional(),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().uuid(),
        priceDeltaMinorSnapshot: z.string().regex(/^-?\d+$/),
      }),
    )
    .optional(),
  removals: z.array(z.object({ ingredientId: z.string().uuid() })).optional(),
});

const updateLineSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  deliveryNote: z.string().max(512).optional(),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().uuid(),
        priceDeltaMinorSnapshot: z.string().regex(/^-?\d+$/),
      }),
    )
    .optional(),
  removals: z.array(z.object({ ingredientId: z.string().uuid() })).optional(),
});

const mergeSchema = z.object({
  guestSessionId: z.string().min(1).max(64),
});

type CartPrincipal = { userId?: string; guestSessionId?: string };

async function resolveCart(
  service: CartService,
  principal: CartPrincipal,
): Promise<{ ok: true; cart: Awaited<ReturnType<CartService['getCart']>> } | { ok: false }> {
  if (principal.userId) {
    return { ok: true, cart: await service.getOrCreateCustomerCart(principal.userId) };
  }
  if (principal.guestSessionId) {
    return { ok: true, cart: await service.getOrCreateGuestCart(principal.guestSessionId) };
  }
  return { ok: false };
}

function buildPrincipal(userId: string): AuthenticatedPrincipal {
  return {
    id: userId,
    actorType: ActorType.CUSTOMER,
    status: 'ACTIVE',
    permissions: new Set<string>(),
    customerId: userId,
  };
}

@Injectable()
@Controller({ path: 'storefront/cart' })
export class CartController {
  constructor(
    @Inject(CartService) private readonly cartService: CartService,
    @Inject(CartPricingService) private readonly pricingService: CartPricingService,
    @Inject(CartValidationService) private readonly validationService: CartValidationService,
    @Inject(CatalogService) private readonly catalogService: CatalogService,
    @Inject(CartOwnershipPolicy) private readonly ownership: CartOwnershipPolicy,
    @Inject(CustomerAuthService) private readonly customerAuth: CustomerAuthService,
  ) {}

  @Get()
  async getCart(@Req() req: FastifyRequest): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const resolved = await resolveCart(this.cartService, principal);
    if (!resolved.ok) {
      return this.unauthenticated();
    }
    return {
      data: await this.serialize(resolved.cart),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('lines')
  @HttpCode(201)
  async addLine(@Req() req: FastifyRequest, @Body() body: unknown): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const resolved = await resolveCart(this.cartService, principal);
    if (!resolved.ok) {
      return this.unauthenticated();
    }
    const parsed = safeValidate(addLineSchema, body);
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
    const input: AddCartLineInput = {
      productId: parsed.data.productId,
      productVariantId: parsed.data.productVariantId,
      quantity: parsed.data.quantity,
      unitPriceMinorSnapshot: parsed.data.unitPriceMinorSnapshot
        ? BigInt(parsed.data.unitPriceMinorSnapshot)
        : undefined,
      currencySnapshot: parsed.data.currencySnapshot,
      deliveryNote: parsed.data.deliveryNote,
      modifiers: parsed.data.modifiers?.map((m) => ({
        modifierId: m.modifierId,
        priceDeltaMinorSnapshot: BigInt(m.priceDeltaMinorSnapshot),
      })),
      removals: parsed.data.removals,
    };
    let validated;
    try {
      validated = await this.validationService.validate(input, this.catalogService);
    } catch (err) {
      return this.translateValidationError(err);
    }
    const after = await this.cartService.addLine(resolved.cart.id, {
      productId: validated.productId,
      productVariantId: validated.productVariantId,
      quantity: validated.quantity,
      unitPriceMinorSnapshot: validated.unitPriceMinor,
      currencySnapshot: validated.currency,
      deliveryNote: input.deliveryNote,
      modifiers: input.modifiers,
      removals: input.removals,
    });
    return {
      data: await this.serialize(after),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Patch('lines/:lineId')
  async updateLine(
    @Req() req: FastifyRequest,
    @Param('lineId') lineId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const resolved = await resolveCart(this.cartService, principal);
    if (!resolved.ok) {
      return this.unauthenticated();
    }
    const parsed = safeValidate(updateLineSchema, body);
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
    if (resolved.cart.userId && principal.userId) {
      this.ownership.enforce(buildPrincipal(principal.userId), {
        userId: resolved.cart.userId,
        guestSessionId: resolved.cart.guestSessionId,
      });
    }
    const patch: UpdateCartLineInput = {
      quantity: parsed.data.quantity,
      deliveryNote: parsed.data.deliveryNote,
      modifiers: parsed.data.modifiers?.map((m) => ({
        modifierId: m.modifierId,
        priceDeltaMinorSnapshot: BigInt(m.priceDeltaMinorSnapshot),
      })),
      removals: parsed.data.removals,
    };
    try {
      const after = await this.cartService.updateLine(resolved.cart.id, lineId, patch);
      return {
        data: await this.serialize(after),
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      return this.translateValidationError(err);
    }
  }

  @Delete('lines/:lineId')
  @HttpCode(200)
  async removeLine(@Req() req: FastifyRequest, @Param('lineId') lineId: string): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const resolved = await resolveCart(this.cartService, principal);
    if (!resolved.ok) {
      return this.unauthenticated();
    }
    if (resolved.cart.userId && principal.userId) {
      this.ownership.enforce(buildPrincipal(principal.userId), {
        userId: resolved.cart.userId,
        guestSessionId: resolved.cart.guestSessionId,
      });
    }
    const after = await this.cartService.removeLine(resolved.cart.id, lineId);
    return {
      data: await this.serialize(after),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Delete()
  @HttpCode(200)
  async clearCart(@Req() req: FastifyRequest): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const resolved = await resolveCart(this.cartService, principal);
    if (!resolved.ok) {
      return this.unauthenticated();
    }
    const after = await this.cartService.clearCart(resolved.cart.id);
    return {
      data: await this.serialize(after),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('merge')
  @HttpCode(200)
  async mergeCart(@Req() req: FastifyRequest, @Body() body: unknown): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const userId = principal.userId;
    if (!userId) {
      return this.unauthenticated();
    }
    const parsed = safeValidate(mergeSchema, body);
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
    const after = await this.cartService.mergeGuestIntoCustomer(parsed.data.guestSessionId, userId);
    return {
      data: await this.serialize(after),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('quote')
  @HttpCode(200)
  async quoteCart(@Req() req: FastifyRequest): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    const resolved = await resolveCart(this.cartService, principal);
    if (!resolved.ok) {
      return this.unauthenticated();
    }
    const cart = resolved.cart;
    const lines = cart.lineItems.map((li) => ({
      unitPriceMinor: li.unitPriceMinorSnapshot,
      modifierDeltaMinor: li.modifiers.reduce((acc, m) => acc + m.priceDeltaMinorSnapshot, 0n),
      quantity: li.quantity,
    }));
    const currency = cart.lineItems[0]?.currencySnapshot ?? 'TRY';
    const quote = this.pricingService.quote(lines, currency);
    return {
      data: {
        currency: quote.currency,
        subtotalMinor: quote.subtotalMinor.toString(),
        lineSubtotals: quote.lines.map((l) => l.lineSubtotalMinor.toString()),
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  private unauthenticated(): unknown {
    return {
      error: {
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'Sepeti görmek için giriş yapmalısınız.',
        requestId: REQUEST_ID,
      },
    };
  }

  private translateValidationError(err: unknown): unknown {
    const e = err as { name?: string; getStatus?: () => number; response?: unknown };
    if (e.name === 'NotFoundException') {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart line not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    if (e.name === 'BadRequestException') {
      return (
        (e.response as unknown) ?? {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'One or more fields are invalid.',
            requestId: REQUEST_ID,
          },
        }
      );
    }
    throw err;
  }

  private async serialize(cart: Awaited<ReturnType<CartService['getCart']>>): Promise<unknown> {
    const uniqueIds = [...new Set(cart.lineItems.map((li) => li.productId))];
    const details = new Map<string, Awaited<ReturnType<CatalogService['getStorefrontProductDetail']>>>();
    await Promise.all(
      uniqueIds.map(async (productId) => {
        try {
          const detail = await this.catalogService.getStorefrontProductDetail(productId, {
            includeRecommendations: false,
          });
          details.set(productId, detail);
        } catch {
          /* product may have been removed; presentation falls back to ids */
        }
      }),
    );
    return {
      id: cart.id,
      userId: cart.userId,
      guestSessionId: cart.guestSessionId,
      status: cart.status,
      branchId: cart.branchId,
      lineItems: cart.lineItems.map((li) => {
        const detail = details.get(li.productId);
        const variant = detail?.variants.find((item) => item.id === li.productVariantId);
        const modifiersById = new Map(
          (detail?.modifierGroups ?? []).flatMap((group) =>
            group.modifiers.map((mod) => [mod.id, mod] as const),
          ),
        );
        const removalsById = new Map((detail?.removalOptions ?? []).map((item) => [item.id, item]));
        return {
          id: li.id,
          productId: li.productId,
          productVariantId: li.productVariantId,
          quantity: li.quantity,
          unitPriceMinorSnapshot: li.unitPriceMinorSnapshot.toString(),
          currencySnapshot: li.currencySnapshot,
          deliveryNote: li.deliveryNote,
          displayOrder: li.displayOrder,
          productName: detail?.name ?? null,
          imageUrl: detail?.media[0]?.url ?? null,
          variantName: variant?.name ?? null,
          isAvailable: detail?.isAvailable ?? true,
          modifiers: li.modifiers.map((m) => ({
            modifierId: m.modifierId,
            name: modifiersById.get(m.modifierId)?.name ?? null,
            priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot.toString(),
          })),
          removals: li.removals.map((r) => ({
            ingredientId: r.ingredientId,
            name: removalsById.get(r.ingredientId)?.name ?? null,
          })),
        };
      }),
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
      expiresAt: cart.expiresAt?.toISOString() ?? null,
    };
  }
}
