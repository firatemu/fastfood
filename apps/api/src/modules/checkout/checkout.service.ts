/**
 * Checkout quote, session snapshot, eligible slots, payment-method
 * catalog, and paid-session → Order finalization.
 */
import { randomUUID } from 'node:crypto';

import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { BranchService } from '../branch/branch.service.js';
import { calculateDistanceKm, RoutingService } from '../branch/routing/routing.service.js';
import { CartService, type CartDto } from '../cart/cart.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { ClubService } from '../loyalty/club.service.js';
import { OrderService } from '../order/order.service.js';
import { PICKUP_DISCOUNT_BPS, type PricingQuoteResult } from '../pricing/pricing.engine.js';
import { PricingService } from '../pricing/pricing.service.js';
import { PromotionService, type PromotionDto } from '../promotion/promotion.service.js';

import { isEligibleScheduledInstant, listEligibleSlots } from './checkout-slots.js';

export type FulfillmentMode = 'DELIVERY' | 'PICKUP';

export const MAX_TIP_MINOR = 50_000n;

export const STOREFRONT_PAYMENT_METHODS = [
  {
    code: 'iyzico_hosted',
    label: 'Banka / Kredi Kartı',
    available: true,
    disabledReason: null as string | null,
  },
  {
    code: 'masterpass',
    label: 'Masterpass / Hızlı',
    available: false,
    disabledReason: 'Yakında',
  },
  {
    code: 'card_on_delivery',
    label: 'Kapıda Kredi Kartı',
    available: false,
    disabledReason: 'Bu şubede kapalı',
  },
] as const;

export interface CheckoutQuoteInput {
  fulfillmentMode?: FulfillmentMode;
  latitude?: number;
  longitude?: number;
  pickupBranchId?: string;
  deliveryBranchId?: string;
  couponCode?: string;
  loyaltyRequestedMinor?: bigint;
  loyaltyAvailablePoints?: bigint;
  tipMinor?: bigint;
  scheduledFor?: Date | null;
  ecoPackaging?: boolean;
  contactless?: boolean;
  buildingAccessCode?: string | null;
  deliveryNote?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  checkoutSessionId?: string;
  addressLabel?: string | null;
}

export interface CheckoutQuoteDto {
  checkoutSessionId: string;
  currency: string;
  fulfillmentMode: FulfillmentMode;
  branchId: string;
  branchName: string;
  branchAddressLine: string;
  etaMinutesMin: number;
  etaMinutesMax: number;
  serviceAreaId: string | null;
  promotionId: string | null;
  merchandiseGrossSubtotalMinor: string;
  productDiscountTotalMinor: string;
  cartDiscountTotalMinor: string;
  merchandiseNetSubtotalMinor: string;
  pickupDiscountMinor: string;
  pickupDiscountBps: number;
  minimumOrderEligible: boolean;
  deliveryFeeMinor: string;
  payableBeforeLoyaltyMinor: string;
  loyaltyRedeemedMinor: string;
  tipMinor: string;
  finalPayableMinor: string;
  scheduledFor: string | null;
  ecoPackaging: boolean;
  contactless: boolean;
  buildingAccessCode: string | null;
  deliveryNote: string | null;
  paymentMethods: typeof STOREFRONT_PAYMENT_METHODS;
  validationErrors: string[];
  serviceableBranches?: Array<{
    branchId: string;
    branchName: string;
    branchAddressLine?: string;
    serviceAreaId: string;
    priority: number;
    distanceKm?: number;
  }>;
}

export interface CheckoutSessionSnapshot {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  cartId: string;
  branchId: string;
  status: string;
  currency: string;
  fulfillmentMode: FulfillmentMode;
  scheduledFor: Date | null;
  tipMinor: bigint;
  pickupDiscountMinor: bigint;
  ecoPackaging: boolean;
  contactless: boolean;
  buildingAccessCode: string | null;
  deliveryNote: string | null;
  guestName: string | null;
  guestPhone: string | null;
  merchandiseNetMinor: bigint;
  deliveryFeeMinor: bigint;
  loyaltyRedeemedMinor: bigint;
  finalPayableMinor: bigint;
  orderId: string | null;
  quoteSnapshotJson: Record<string, unknown> | null;
  latitude?: number;
  longitude?: number;
  addressLabel?: string | null;
}

interface QuoteOk {
  ok: true;
  quote: CheckoutQuoteDto;
}

interface QuoteErr {
  ok: false;
  code: string;
  message: string;
}

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

@Injectable()
export class CheckoutService {
  readonly #sessions = new Map<string, CheckoutSessionSnapshot>();

  constructor(
    @Inject(CartService) private readonly carts: CartService,
    @Inject(PricingService) private readonly pricing: PricingService,
    @Inject(BranchService) private readonly branches: BranchService,
    @Inject(RoutingService) private readonly routing: RoutingService,
    @Inject(PromotionService) private readonly promotions: PromotionService,
    @Optional() @Inject(OrderService) private readonly orders: OrderService | null = null,
    @Optional() @Inject(CatalogService) private readonly catalog: CatalogService | null = null,
    @Optional() @Inject(ClubService) private readonly club: ClubService | null = null,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  paymentMethods(): typeof STOREFRONT_PAYMENT_METHODS {
    return STOREFRONT_PAYMENT_METHODS;
  }

  async listSlots(branchId: string, now = new Date()) {
    const hours = await this.branches.getOperatingHours(branchId);
    return {
      timezone: 'Europe/Istanbul',
      prepMinutes: 20,
      slots: listEligibleSlots({ now, hours }),
    };
  }

  async quote(
    cart: CartDto,
    principal: { userId?: string; guestSessionId?: string },
    input: CheckoutQuoteInput,
  ): Promise<QuoteOk | QuoteErr> {
    if (cart.lineItems.length === 0) {
      return { ok: false, code: ErrorCodes.VALIDATION_ERROR, message: 'Cart is empty.' };
    }

    const fulfillmentMode: FulfillmentMode =
      input.fulfillmentMode === 'PICKUP' ? 'PICKUP' : 'DELIVERY';
    const contactless = fulfillmentMode === 'DELIVERY' ? Boolean(input.contactless) : false;
    const tipMinor = input.tipMinor ?? 0n;
    if (tipMinor < 0n || tipMinor > MAX_TIP_MINOR) {
      return {
        ok: false,
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Tip amount is outside the allowed range.',
      };
    }

    let branchId: string;
    let serviceAreaId: string | null = null;
    let serviceableBranches: CheckoutQuoteDto['serviceableBranches'] = undefined;

    if (fulfillmentMode === 'DELIVERY') {
      if (input.latitude === undefined || input.longitude === undefined) {
        return {
          ok: false,
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Latitude and longitude are required for delivery checkout.',
        };
      }
      const areas = await this.branches.listServiceAreas();
      const assignments = this.routing.assignAll(input.latitude, input.longitude, areas);
      if (assignments.length === 0) {
        return {
          ok: false,
          code: ErrorCodes.ADDRESS_NOT_SERVICEABLE,
          message: 'No branch serves this location.',
        };
      }

      // Deduplicate by branchId, keeping lowest priority for each branch
      const branchMap = new Map<string, (typeof assignments)[number]>();
      for (const a of assignments) {
        if (!branchMap.has(a.branchId) || a.priority < branchMap.get(a.branchId)!.priority) {
          branchMap.set(a.branchId, a);
        }
      }
      const uniqueAssignments = [...branchMap.values()].sort((a, b) => a.priority - b.priority);

      const enriched = await Promise.all(
        uniqueAssignments.map(async (a) => {
          try {
            const b = await this.branches.getBranch(a.branchId);
            const distanceKm = calculateDistanceKm(
              input.latitude!,
              input.longitude!,
              b.latitude,
              b.longitude,
            );
            return {
              branchId: a.branchId,
              branchName: b.name,
              branchAddressLine: b.addressLine,
              serviceAreaId: a.serviceAreaId,
              priority: a.priority,
              isAcceptingOrders: b.isAcceptingOrders,
              distanceKm,
            };
          } catch {
            return {
              branchId: a.branchId,
              branchName: 'Şube',
              branchAddressLine: '',
              serviceAreaId: a.serviceAreaId,
              priority: a.priority,
              isAcceptingOrders: true,
              distanceKm: undefined,
            };
          }
        }),
      );

      // Sadece sipariş kabul eden ve azami 10.0 km mesafe içinde bulunan şubeler uygundur
      const activeEligible = enriched.filter(
        (sb) => sb.isAcceptingOrders && (sb.distanceKm === undefined || sb.distanceKm <= 10.0),
      );
      if (activeEligible.length === 0) {
        return {
          ok: false,
          code: ErrorCodes.ADDRESS_NOT_SERVICEABLE,
          message: 'No branch serves this location within the maximum 10.0 km radius.',
        };
      }

      serviceableBranches = activeEligible.map(({ isAcceptingOrders, ...rest }) => rest);

      const requestedBranchId = input.deliveryBranchId;
      const matchingRequested = requestedBranchId
        ? activeEligible.find((sb) => sb.branchId === requestedBranchId)
        : null;
      const chosen = matchingRequested ?? activeEligible[0]!;
      branchId = chosen.branchId;
      serviceAreaId = chosen.serviceAreaId;
    } else {
      const requested = input.pickupBranchId ?? cart.branchId;
      const list = await this.branches.listBranches();
      const eligible = list.filter((b) => b.isActive && b.isAcceptingOrders);
      const selected = requested ? eligible.find((b) => b.id === requested) : eligible[0];
      if (!selected) {
        return {
          ok: false,
          code: ErrorCodes.ADDRESS_NOT_SERVICEABLE,
          message: 'No pickup branch is accepting orders.',
        };
      }
      branchId = selected.id;
    }

    const branch = await this.branches.getBranch(branchId);
    if (!branch.isAcceptingOrders) {
      return {
        ok: false,
        code: ErrorCodes.ADDRESS_NOT_SERVICEABLE,
        message: 'Assigned branch is not accepting orders.',
      };
    }

    if (input.scheduledFor) {
      const hours = await this.branches.getOperatingHours(branch.id);
      if (!isEligibleScheduledInstant(input.scheduledFor, hours, new Date())) {
        return {
          ok: false,
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Scheduled time is outside branch hours or the allowed horizon.',
        };
      }
    }

    await this.carts.setBranchId(cart.id, branch.id);

    let cartDiscountMinor = 0n;
    let deliveryFeeMinor = fulfillmentMode === 'PICKUP' ? 0n : branch.deliveryFeeMinor;
    let appliedPromotionId: string | null = null;

    const merchandiseProbe = cart.lineItems.reduce((acc, li) => {
      const mods = li.modifiers.reduce((a, m) => a + m.priceDeltaMinorSnapshot, 0n);
      return acc + (li.unitPriceMinorSnapshot + mods) * BigInt(li.quantity);
    }, 0n);

    if (input.couponCode) {
      const promo = await this.promotions.validateCode(input.couponCode);
      if (!promo) {
        return {
          ok: false,
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Coupon code is invalid or inactive.',
        };
      }
      const applied = await this.applyPromotion(
        promo,
        branch.id,
        merchandiseProbe,
        deliveryFeeMinor,
      );
      if (!applied.ok) return applied;
      cartDiscountMinor = applied.cartDiscountMinor;
      deliveryFeeMinor = applied.deliveryFeeMinor;
      appliedPromotionId = promo.id;
    } else if (principal.userId && this.club) {
      const welcome = await this.club.getApplicableWelcomePromotion(principal.userId);
      if (welcome) {
        const blocked = await this.welcomeBlockedByPriorOrder(
          principal.userId,
          welcome.firstOrderOnly,
        );
        if (!blocked) {
          const applied = await this.applyPromotion(
            welcome,
            branch.id,
            merchandiseProbe,
            deliveryFeeMinor,
          );
          if (applied.ok) {
            cartDiscountMinor = applied.cartDiscountMinor;
            deliveryFeeMinor = applied.deliveryFeeMinor;
            appliedPromotionId = welcome.id;
          }
        }
      }
    }

    const pickupDiscountBps = fulfillmentMode === 'PICKUP' ? PICKUP_DISCOUNT_BPS : 0;
    const engine: PricingQuoteResult = this.pricing.quote({
      lines: cart.lineItems.map((li) => ({
        baseUnitPriceMinor: li.unitPriceMinorSnapshot,
        modifierUnitTotalMinor: li.modifiers.reduce(
          (acc, m) => acc + m.priceDeltaMinorSnapshot,
          0n,
        ),
        quantity: li.quantity,
      })),
      cartDiscountMinor,
      deliveryFeeMinor,
      minimumOrderMinor: branch.minOrderMinor,
      loyaltyRequestedMinor: input.loyaltyRequestedMinor ?? 0n,
      loyaltyAvailablePoints: input.loyaltyAvailablePoints ?? 0n,
      pickupDiscountBps,
      tipMinor,
      currency: cart.lineItems[0]?.currencySnapshot ?? 'TRY',
    });

    const validationErrors: string[] = [];
    if (!engine.minimumOrderEligible) {
      validationErrors.push('MINIMUM_ORDER_NOT_MET');
    }

    const checkoutSessionId = input.checkoutSessionId ?? randomUUID();
    const items = await this.#snapshotItems(cart);
    const quote: CheckoutQuoteDto = {
      checkoutSessionId,
      currency: engine.currency,
      fulfillmentMode,
      branchId: branch.id,
      branchName: branch.name,
      branchAddressLine: branch.addressLine,
      etaMinutesMin: branch.estimatedDeliveryMinutesMin,
      etaMinutesMax: branch.estimatedDeliveryMinutesMax,
      serviceAreaId,
      promotionId: appliedPromotionId,
      merchandiseGrossSubtotalMinor: engine.merchandiseGrossSubtotalMinor.toString(),
      productDiscountTotalMinor: engine.productDiscountTotalMinor.toString(),
      cartDiscountTotalMinor: engine.cartDiscountTotalMinor.toString(),
      merchandiseNetSubtotalMinor: engine.merchandiseNetSubtotalMinor.toString(),
      pickupDiscountMinor: engine.pickupDiscountMinor.toString(),
      pickupDiscountBps,
      minimumOrderEligible: engine.minimumOrderEligible,
      deliveryFeeMinor: engine.deliveryFeeMinor.toString(),
      payableBeforeLoyaltyMinor: engine.payableBeforeLoyaltyMinor.toString(),
      loyaltyRedeemedMinor: engine.loyaltyRedeemedMinor.toString(),
      tipMinor: engine.tipMinor.toString(),
      finalPayableMinor: engine.finalPayableMinor.toString(),
      scheduledFor: input.scheduledFor ? input.scheduledFor.toISOString() : null,
      ecoPackaging: Boolean(input.ecoPackaging),
      contactless,
      buildingAccessCode: input.buildingAccessCode ?? null,
      deliveryNote: input.deliveryNote ?? null,
      paymentMethods: STOREFRONT_PAYMENT_METHODS,
      validationErrors,
      serviceableBranches,
    };

    const snapshot: CheckoutSessionSnapshot = {
      id: checkoutSessionId,
      userId: principal.userId ?? null,
      guestSessionId: principal.guestSessionId ?? null,
      cartId: cart.id,
      branchId: branch.id,
      status: 'OPEN',
      currency: engine.currency,
      fulfillmentMode,
      scheduledFor: input.scheduledFor ?? null,
      tipMinor: engine.tipMinor,
      pickupDiscountMinor: engine.pickupDiscountMinor,
      ecoPackaging: quote.ecoPackaging,
      contactless,
      buildingAccessCode: quote.buildingAccessCode,
      deliveryNote: quote.deliveryNote,
      guestName: input.guestName ?? null,
      guestPhone: input.guestPhone ?? null,
      merchandiseNetMinor: engine.merchandiseNetSubtotalMinor,
      deliveryFeeMinor: engine.deliveryFeeMinor,
      loyaltyRedeemedMinor: engine.loyaltyRedeemedMinor,
      finalPayableMinor: engine.finalPayableMinor,
      orderId: null,
      latitude: input.latitude,
      longitude: input.longitude,
      addressLabel: input.addressLabel ?? null,
      quoteSnapshotJson: {
        ...quote,
        items,
        latitude: input.latitude,
        longitude: input.longitude,
        addressLabel: input.addressLabel ?? null,
      } as unknown as Record<string, unknown>,
    };
    await this.#persistSession(snapshot);
    return { ok: true, quote };
  }

  async getSession(checkoutSessionId: string): Promise<CheckoutSessionSnapshot | null> {
    const memory = this.#sessions.get(checkoutSessionId);
    if (memory) return memory;
    if (!this.prisma) return null;
    const row = await this.prisma.checkoutSession.findUnique({ where: { id: checkoutSessionId } });
    if (!row) return null;
    return this.#fromRow(row);
  }

  async getOwnedOrder(orderId: string, principal: { userId?: string; guestSessionId?: string }) {
    if (!this.orders) return null;
    const order = await this.orders.get(orderId).catch(() => null);
    if (!order) return null;
    const session = order.checkoutSessionId ? await this.getSession(order.checkoutSessionId) : null;
    const ownsUser = Boolean(
      principal.userId &&
        (order.userId === principal.userId || session?.userId === principal.userId),
    );
    const ownsGuest = Boolean(
      principal.guestSessionId && session?.guestSessionId === principal.guestSessionId,
    );
    if (!ownsUser && !ownsGuest) return null;
    const branch = order.branchId
      ? await this.branches.getBranch(order.branchId).catch(() => null)
      : null;
    return { order, branch, session };
  }

  async finalizePaid(checkoutSessionId: string): Promise<string | null> {
    if (!this.orders) return null;
    const existing = await this.orders.getByCheckoutSessionId(checkoutSessionId);
    if (existing) {
      await this.#attachOrderId(checkoutSessionId, existing.id);
      return existing.id;
    }
    const session = await this.getSession(checkoutSessionId);
    if (!session) return null;
    if (session.orderId) return session.orderId;

    const cart = await this.carts.getCart(session.cartId).catch(() => null);
    const snapshotItems = (session.quoteSnapshotJson?.items ?? []) as Array<{
      productId: string;
      productVariantId?: string | null;
      productNameSnapshot?: string;
      quantity: number;
      unitPriceMinorSnapshot: string;
      lineGrossMinorSnapshot: string;
      modifiers?: { modifierId: string; nameSnapshot?: string; priceDeltaMinorSnapshot: string }[];
      removals?: { ingredientId: string; nameSnapshot?: string }[];
    }>;
    const items =
      snapshotItems.length > 0
        ? snapshotItems.map((item) => ({
            productId: item.productId,
            productVariantId: item.productVariantId ?? null,
            productNameSnapshot: item.productNameSnapshot ?? 'Ürün',
            quantity: item.quantity,
            unitPriceMinorSnapshot: BigInt(item.unitPriceMinorSnapshot),
            lineGrossMinorSnapshot: BigInt(item.lineGrossMinorSnapshot),
            modifiers: (item.modifiers ?? []).map((m) => ({
              modifierId: m.modifierId,
              nameSnapshot: m.nameSnapshot ?? '',
              priceDeltaMinorSnapshot: BigInt(m.priceDeltaMinorSnapshot),
            })),
            removals: (item.removals ?? []).map((r) => ({
              ingredientId: r.ingredientId,
              nameSnapshot: r.nameSnapshot ?? '',
            })),
          }))
        : (cart?.lineItems ?? []).map((li) => ({
            productId: li.productId,
            productVariantId: li.productVariantId,
            productNameSnapshot: 'Ürün',
            quantity: li.quantity,
            unitPriceMinorSnapshot: li.unitPriceMinorSnapshot,
            lineGrossMinorSnapshot:
              (li.unitPriceMinorSnapshot +
                li.modifiers.reduce((a, m) => a + m.priceDeltaMinorSnapshot, 0n)) *
              BigInt(li.quantity),
            modifiers: li.modifiers.map((m) => ({
              modifierId: m.modifierId,
              nameSnapshot: '',
              priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
            })),
            removals: li.removals.map((r) => ({
              ingredientId: r.ingredientId,
              nameSnapshot: '',
            })),
          }));
    if (items.length === 0) return null;

    const order = await this.orders.create({
      userId: session.userId,
      checkoutSessionId,
      branchId: session.branchId,
      autoAssignBranch: false,
      initialStatus: 'PAID',
      currency: session.currency,
      merchandiseNetMinor: session.merchandiseNetMinor,
      deliveryFeeMinor: session.deliveryFeeMinor,
      loyaltyRedeemedMinor: session.loyaltyRedeemedMinor,
      finalPayableMinor: session.finalPayableMinor,
      fulfillmentMode: session.fulfillmentMode,
      scheduledFor: session.scheduledFor,
      tipMinor: session.tipMinor,
      pickupDiscountMinor: session.pickupDiscountMinor,
      ecoPackaging: session.ecoPackaging,
      contactless: session.contactless,
      buildingAccessCode: session.buildingAccessCode,
      deliveryNote: session.deliveryNote,
      deliveryAddress:
        session.fulfillmentMode === 'DELIVERY' &&
        session.latitude !== undefined &&
        session.longitude !== undefined
          ? {
              latitude: session.latitude,
              longitude: session.longitude,
              line1: session.addressLabel ?? undefined,
            }
          : null,
      items,
    });
    await this.#attachOrderId(checkoutSessionId, order.id);
    if (cart) {
      await this.carts.clearCart(cart.id).catch(() => undefined);
    }
    return order.id;
  }

  async #snapshotItems(cart: CartDto) {
    const items = [];
    for (const li of cart.lineItems) {
      const detail = this.catalog
        ? await this.catalog.getStorefrontProductDetail(li.productId).catch(() => null)
        : null;
      const modifierNames = new Map(
        (detail?.modifierGroups ?? []).flatMap((group) =>
          group.modifiers.map((modifier) => [modifier.id, modifier.name] as const),
        ),
      );
      const removalNames = new Map(
        (detail?.removalOptions ?? []).map((removal) => [removal.id, removal.name] as const),
      );
      const modifierTotal = li.modifiers.reduce((a, m) => a + m.priceDeltaMinorSnapshot, 0n);
      items.push({
        productId: li.productId,
        productVariantId: li.productVariantId,
        productNameSnapshot: detail?.name ?? 'Ürün',
        quantity: li.quantity,
        unitPriceMinorSnapshot: li.unitPriceMinorSnapshot.toString(),
        lineGrossMinorSnapshot: (
          (li.unitPriceMinorSnapshot + modifierTotal) *
          BigInt(li.quantity)
        ).toString(),
        modifiers: li.modifiers.map((m) => ({
          modifierId: m.modifierId,
          nameSnapshot: modifierNames.get(m.modifierId) ?? '',
          priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot.toString(),
        })),
        removals: li.removals.map((r) => ({
          ingredientId: r.ingredientId,
          nameSnapshot: removalNames.get(r.ingredientId) ?? '',
        })),
      });
    }
    return items;
  }

  async #persistSession(snapshot: CheckoutSessionSnapshot): Promise<void> {
    this.#sessions.set(snapshot.id, snapshot);
    if (!this.prisma) return;
    await this.prisma.checkoutSession.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        userId: snapshot.userId,
        guestSessionId: snapshot.guestSessionId,
        cartId: snapshot.cartId,
        branchId: snapshot.branchId,
        status: snapshot.status,
        currency: snapshot.currency,
        merchandiseGrossMinor: 0n,
        merchandiseNetMinor: snapshot.merchandiseNetMinor,
        deliveryFeeMinor: snapshot.deliveryFeeMinor,
        loyaltyRedeemedMinor: snapshot.loyaltyRedeemedMinor,
        finalPayableMinor: snapshot.finalPayableMinor,
        fulfillmentMode: snapshot.fulfillmentMode,
        scheduledFor: snapshot.scheduledFor,
        tipMinor: snapshot.tipMinor,
        pickupDiscountMinor: snapshot.pickupDiscountMinor,
        ecoPackaging: snapshot.ecoPackaging,
        contactless: snapshot.contactless,
        buildingAccessCode: snapshot.buildingAccessCode,
        deliveryNote: snapshot.deliveryNote,
        guestName: snapshot.guestName,
        guestPhone: snapshot.guestPhone,
        quoteSnapshotJson: snapshot.quoteSnapshotJson as never,
      },
      update: {
        branchId: snapshot.branchId,
        cartId: snapshot.cartId,
        currency: snapshot.currency,
        merchandiseNetMinor: snapshot.merchandiseNetMinor,
        deliveryFeeMinor: snapshot.deliveryFeeMinor,
        loyaltyRedeemedMinor: snapshot.loyaltyRedeemedMinor,
        finalPayableMinor: snapshot.finalPayableMinor,
        fulfillmentMode: snapshot.fulfillmentMode,
        scheduledFor: snapshot.scheduledFor,
        tipMinor: snapshot.tipMinor,
        pickupDiscountMinor: snapshot.pickupDiscountMinor,
        ecoPackaging: snapshot.ecoPackaging,
        contactless: snapshot.contactless,
        buildingAccessCode: snapshot.buildingAccessCode,
        deliveryNote: snapshot.deliveryNote,
        guestName: snapshot.guestName,
        guestPhone: snapshot.guestPhone,
        quoteSnapshotJson: snapshot.quoteSnapshotJson as never,
      },
    });
  }

  private async applyPromotion(
    promo: PromotionDto,
    branchId: string,
    merchandiseProbe: bigint,
    deliveryFeeMinor: bigint,
  ): Promise<{ ok: true; cartDiscountMinor: bigint; deliveryFeeMinor: bigint } | QuoteErr> {
    if (promo.branchIds && promo.branchIds.length > 0 && !promo.branchIds.includes(branchId)) {
      return {
        ok: false,
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Coupon is not valid for the assigned branch.',
      };
    }
    if (merchandiseProbe < promo.minMerchandiseMinor) {
      return {
        ok: false,
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Cart does not meet coupon minimum merchandise.',
      };
    }
    const applied = this.promotions.computeDiscount(promo, {
      merchandiseGrossMinor: merchandiseProbe,
      deliveryFeeMinor,
    });
    return {
      ok: true,
      cartDiscountMinor: applied.cartDiscountMinor,
      deliveryFeeMinor: applied.deliveryFeeMinor,
    };
  }

  private async welcomeBlockedByPriorOrder(
    userId: string,
    firstOrderOnly: boolean,
  ): Promise<boolean> {
    if (!firstOrderOnly || !this.orders) return false;
    const orders = await this.orders.listByUser(userId);
    return orders.some(
      (order) =>
        order.status !== 'DRAFT' &&
        order.status !== 'CREATED' &&
        order.status !== 'PAYMENT_PENDING' &&
        order.status !== 'PAYMENT_FAILED' &&
        order.status !== 'CANCELLED',
    );
  }

  async #attachOrderId(checkoutSessionId: string, orderId: string): Promise<void> {
    const memory = this.#sessions.get(checkoutSessionId);
    if (memory) {
      memory.orderId = orderId;
      memory.status = 'PAID';
    }
    if (!this.prisma) return;
    await this.prisma.checkoutSession
      .update({
        where: { id: checkoutSessionId },
        data: { orderId, status: 'PAID' },
      })
      .catch(() => undefined);
  }

  #fromRow(row: {
    id: string;
    userId: string | null;
    guestSessionId: string | null;
    cartId: string | null;
    branchId: string | null;
    status: string;
    currency: string;
    fulfillmentMode: string;
    scheduledFor: Date | null;
    tipMinor: bigint;
    pickupDiscountMinor: bigint;
    ecoPackaging: boolean;
    contactless: boolean;
    buildingAccessCode: string | null;
    deliveryNote: string | null;
    guestName: string | null;
    guestPhone: string | null;
    merchandiseNetMinor: bigint;
    deliveryFeeMinor: bigint;
    loyaltyRedeemedMinor: bigint;
    finalPayableMinor: bigint;
    orderId: string | null;
    quoteSnapshotJson: unknown;
  }): CheckoutSessionSnapshot {
    const snap = (row.quoteSnapshotJson ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      userId: row.userId,
      guestSessionId: row.guestSessionId,
      cartId: row.cartId ?? '',
      branchId: row.branchId ?? '',
      status: row.status,
      currency: row.currency,
      fulfillmentMode: row.fulfillmentMode === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
      scheduledFor: row.scheduledFor,
      tipMinor: row.tipMinor,
      pickupDiscountMinor: row.pickupDiscountMinor,
      ecoPackaging: row.ecoPackaging,
      contactless: row.contactless,
      buildingAccessCode: row.buildingAccessCode,
      deliveryNote: row.deliveryNote,
      guestName: row.guestName,
      guestPhone: row.guestPhone,
      merchandiseNetMinor: row.merchandiseNetMinor,
      deliveryFeeMinor: row.deliveryFeeMinor,
      loyaltyRedeemedMinor: row.loyaltyRedeemedMinor,
      finalPayableMinor: row.finalPayableMinor,
      orderId: row.orderId,
      quoteSnapshotJson: snap,
      latitude: typeof snap.latitude === 'number' ? snap.latitude : undefined,
      longitude: typeof snap.longitude === 'number' ? snap.longitude : undefined,
      addressLabel: typeof snap.addressLabel === 'string' ? snap.addressLabel : null,
    };
  }
}

export { REQUEST_ID as CHECKOUT_REQUEST_ID };
