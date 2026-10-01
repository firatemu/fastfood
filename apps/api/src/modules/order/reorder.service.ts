import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional, forwardRef } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { CheckoutService } from '../checkout/checkout.service.js';

import { OrderService, type OrderItemDto } from './order.service.js';

export type ReorderItemOutcome =
  | 'restored'
  | 'price_changed'
  | 'modifier_removed'
  | 'variant_unavailable'
  | 'product_unavailable';

export interface ReorderItemResult {
  productId: string;
  productName: string;
  quantity: number;
  outcome: ReorderItemOutcome;
  historicalUnitPriceMinor: string;
  currentUnitPriceMinor: string | null;
  message: string;
}

export interface ReorderResult {
  status: 'success' | 'partial' | 'unavailable';
  cartId: string | null;
  restoredCount: number;
  reviewCount: number;
  unavailableCount: number;
  items: ReorderItemResult[];
}

@Injectable()
export class ReorderService {
  constructor(
    @Inject(OrderService) private readonly orders: OrderService,
    @Inject(CartService) private readonly carts: CartService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(forwardRef(() => CheckoutService))
    private readonly checkout: CheckoutService,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  async reorder(
    orderId: string,
    principal: { userId?: string; guestSessionId?: string },
  ): Promise<ReorderResult> {
    const order = await this.assertOwnedOrder(orderId, principal);
    if (!principal.userId && !principal.guestSessionId) {
      throw new NotFoundException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'Authentication required.',
      });
    }
    const cart = principal.userId
      ? await this.carts.getOrCreateCustomerCart(principal.userId)
      : await this.carts.getOrCreateGuestCart(principal.guestSessionId as string);

    const items: ReorderItemResult[] = [];
    for (const line of order.items) {
      items.push(await this.restoreLine(cart.id, line));
    }

    const restoredCount = items.filter((item) => item.outcome === 'restored' || item.outcome === 'price_changed' || item.outcome === 'modifier_removed').length;
    const reviewCount = items.filter(
      (item) => item.outcome === 'price_changed' || item.outcome === 'modifier_removed',
    ).length;
    const unavailableCount = items.filter(
      (item) => item.outcome === 'product_unavailable' || item.outcome === 'variant_unavailable',
    ).length;

    let status: ReorderResult['status'] = 'success';
    if (restoredCount === 0) status = 'unavailable';
    else if (unavailableCount > 0 || reviewCount > 0) status = 'partial';

    return {
      status,
      cartId: restoredCount > 0 ? cart.id : null,
      restoredCount,
      reviewCount,
      unavailableCount,
      items,
    };
  }

  private async assertOwnedOrder(orderId: string, principal: { userId?: string; guestSessionId?: string }) {
    const order = await this.orders.get(orderId).catch(() => null);
    if (!order) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found.' });
    }
    if (principal.userId && order.userId === principal.userId) {
      return order;
    }
    if (principal.guestSessionId && order.checkoutSessionId) {
      const session = await this.checkout.getSession(order.checkoutSessionId);
      if (session?.guestSessionId === principal.guestSessionId) {
        return order;
      }
      if (this.prisma) {
        const row = await this.prisma.checkoutSession.findUnique({
          where: { id: order.checkoutSessionId },
        });
        if (row?.guestSessionId === principal.guestSessionId) {
          return order;
        }
      }
    }
    throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found.' });
  }

  private async restoreLine(cartId: string, line: OrderItemDto): Promise<ReorderItemResult> {
    const historical = line.unitPriceMinorSnapshot.toString();
    try {
      const product = await this.catalog.getProduct(line.productId);
      const available = product.isActive;
      if (!available) {
        return {
          productId: line.productId,
          productName: line.productNameSnapshot,
          quantity: line.quantity,
          outcome: 'product_unavailable',
          historicalUnitPriceMinor: historical,
          currentUnitPriceMinor: null,
          message: 'Bu ürün artık menüde yok.',
        };
      }
      const detail = await this.catalog.getStorefrontProductDetail(line.productId);
      if (!detail.isAvailable) {
        return {
          productId: line.productId,
          productName: line.productNameSnapshot,
          quantity: line.quantity,
          outcome: 'product_unavailable',
          historicalUnitPriceMinor: historical,
          currentUnitPriceMinor: product.basePriceMinor.toString(),
          message: 'Bu ürün şu an siparişe kapalı.',
        };
      }

      let unitPrice = product.basePriceMinor;
      let variantId: string | undefined;
      if (line.productVariantId) {
        const variant = detail.variants.find((item) => item.id === line.productVariantId);
        if (!variant) {
          return {
            productId: line.productId,
            productName: line.productNameSnapshot,
            quantity: line.quantity,
            outcome: 'variant_unavailable',
            historicalUnitPriceMinor: historical,
            currentUnitPriceMinor: product.basePriceMinor.toString(),
            message: 'Seçilen varyant artık yok. Ürünü yeniden yapılandırın.',
          };
        }
        unitPrice = variant.priceMinor;
        variantId = variant.id;
      }

      const currentModifiers = detail.modifierGroups.flatMap((group) => group.modifiers);
      const kept: { modifierId: string; priceDeltaMinorSnapshot: bigint }[] = [];
      let removedModifier = false;
      for (const modifier of line.modifiers) {
        const found = currentModifiers.find((item) => item.id === modifier.modifierId);
        if (!found) {
          removedModifier = true;
          continue;
        }
        kept.push({
          modifierId: found.id,
          priceDeltaMinorSnapshot: found.priceDeltaMinor,
        });
      }

      await this.carts.addLine(cartId, {
        productId: product.id,
        productVariantId: variantId,
        quantity: line.quantity,
        unitPriceMinorSnapshot: unitPrice,
        currencySnapshot: product.currency,
        modifiers: kept,
        removals: line.removals.map((removal) => ({ ingredientId: removal.ingredientId })),
      });

      const priceChanged = unitPrice !== line.unitPriceMinorSnapshot;
      let outcome: ReorderItemOutcome = 'restored';
      let message = 'Sepete eklendi.';
      if (removedModifier) {
        outcome = 'modifier_removed';
        message = 'Bazı ekstra seçimler artık yok; geçerli hali sepete eklendi.';
      } else if (priceChanged) {
        outcome = 'price_changed';
        message = 'Fiyat güncellendi; geçmiş tutar kullanılmadı.';
      }
      return {
        productId: product.id,
        productName: product.name,
        quantity: line.quantity,
        outcome,
        historicalUnitPriceMinor: historical,
        currentUnitPriceMinor: unitPrice.toString(),
        message,
      };
    } catch {
      return {
        productId: line.productId,
        productName: line.productNameSnapshot,
        quantity: line.quantity,
        outcome: 'product_unavailable',
        historicalUnitPriceMinor: historical,
        currentUnitPriceMinor: null,
        message: 'Bu ürün artık menüde yok.',
      };
    }
  }
}
