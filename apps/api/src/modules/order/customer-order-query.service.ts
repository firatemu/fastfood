import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional, forwardRef } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { BranchService } from '../branch/branch.service.js';
import { CheckoutService } from '../checkout/checkout.service.js';
import { DeliveryService } from '../courier/delivery.service.js';

import {
  customerSafeStatusLabel,
  customerSafeTimelineEvent,
  customerTrackerKind,
  deriveCustomerEta,
  displayOrderNumber,
  isCourierLocationEligible,
  isTrackingActive,
  locationFreshness,
  mapOrderStatusToStitchStepperIndex,
  shortenCourierDisplayName,
  STITCH_TRACKER_STAGES,
  type LocationFreshness,
} from './customer-order-presentation.js';
import { OrderService, type OrderDto } from './order.service.js';

export interface CustomerOrderHistoryItem {
  id: string;
  displayNumber: string;
  status: string;
  statusLabel: string;
  trackerKind: string;
  fulfillmentMode: 'DELIVERY' | 'PICKUP';
  createdAt: string;
  currency: string;
  finalPayableMinor: string;
  itemSummary: string;
  itemCount: number;
  branch: { id: string; name: string } | null;
  trackingAvailable: boolean;
  reorderAvailable: boolean;
}

export interface CustomerCourierCard {
  displayName: string;
  vehicleType: null;
  callAvailable: false;
  chatAvailable: false;
}

export interface CustomerCourierLocation {
  latitude: number;
  longitude: number;
  recordedAt: string;
  accuracyM: number | null;
  freshness: LocationFreshness;
}

@Injectable()
export class CustomerOrderQueryService {
  constructor(
    @Inject(OrderService) private readonly orders: OrderService,
    @Optional() @Inject(BranchService) private readonly branches: BranchService | null = null,
    @Optional()
    @Inject(forwardRef(() => DeliveryService))
    private readonly deliveries: DeliveryService | null = null,
    @Inject(forwardRef(() => CheckoutService))
    private readonly checkout: CheckoutService,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  async listHistory(userId: string): Promise<CustomerOrderHistoryItem[]> {
    const orders = await this.orders.listByUser(userId);
    return Promise.all(orders.map((order) => this.toHistory(order)));
  }

  async getTracking(
    orderId: string,
    principal: { userId?: string; guestSessionId?: string },
  ) {
    const order = await this.assertOwned(orderId, principal);
    const branch = order.branchId && this.branches
      ? await this.branches.getBranch(order.branchId).catch(() => null)
      : null;
    const kind = customerTrackerKind(order.status, order.fulfillmentMode);
    const stepperIndex = mapOrderStatusToStitchStepperIndex(order.status, order.fulfillmentMode);
    const eta = deriveCustomerEta({
      status: order.status,
      fulfillmentMode: order.fulfillmentMode,
      scheduledFor: order.scheduledFor,
      createdAt: order.createdAt,
      estimatedDeliveryMinutesMin: branch?.estimatedDeliveryMinutesMin ?? null,
      estimatedDeliveryMinutesMax: branch?.estimatedDeliveryMinutesMax ?? null,
    });
    const courier = await this.courierCard(order);
    const location = await this.locationIfEligible(order);
    const deliveryCoords =
      order.fulfillmentMode === 'DELIVERY' &&
      order.deliveryAddressJson &&
      typeof order.deliveryAddressJson.latitude === 'number' &&
      typeof order.deliveryAddressJson.longitude === 'number'
        ? {
            latitude: order.deliveryAddressJson.latitude,
            longitude: order.deliveryAddressJson.longitude,
            line1: order.deliveryAddressJson.line1 ?? null,
          }
        : null;
    const destination =
      deliveryCoords ??
      (branch && typeof branch.latitude === 'number' && typeof branch.longitude === 'number'
        ? {
            latitude: branch.latitude,
            longitude: branch.longitude,
            line1: branch.addressLine,
          }
        : null);

    return {
      id: order.id,
      displayNumber: displayOrderNumber(order.id),
      status: order.status,
      statusLabel: customerSafeStatusLabel(order.status, order.fulfillmentMode),
      trackerKind: kind,
      stepperIndex,
      stages: STITCH_TRACKER_STAGES.map((stage) => ({
        index: stage.index,
        key: stage.key,
        label: order.fulfillmentMode === 'PICKUP' ? stage.pickupLabel : stage.label,
        state:
          stepperIndex < 0
            ? 'hidden'
            : stepperIndex > stage.index
              ? 'done'
              : stepperIndex === stage.index
                ? 'active'
                : 'pending',
      })),
      fulfillmentMode: order.fulfillmentMode,
      createdAt: order.createdAt.toISOString(),
      scheduledFor: order.scheduledFor?.toISOString() ?? null,
      currency: order.currency,
      merchandiseNetMinor: order.merchandiseNetMinor.toString(),
      deliveryFeeMinor: order.deliveryFeeMinor.toString(),
      finalPayableMinor: order.finalPayableMinor.toString(),
      trackingActive: isTrackingActive(order.status),
      eta,
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            addressLine: branch.addressLine,
            etaMinutesMin: branch.estimatedDeliveryMinutesMin,
            etaMinutesMax: branch.estimatedDeliveryMinutesMax,
          }
        : null,
      courier,
      location,
      destination,
      timeline: order.events.map(customerSafeTimelineEvent),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productNameSnapshot,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinorSnapshot.toString(),
        lineGrossMinor: item.lineGrossMinorSnapshot.toString(),
      })),
      pollIntervalMs: isTrackingActive(order.status) ? 8_000 : null,
    };
  }

  async getCourierLocation(
    orderId: string,
    principal: { userId?: string; guestSessionId?: string },
  ): Promise<CustomerCourierLocation> {
    const order = await this.assertOwned(orderId, principal);
    const location = await this.locationIfEligible(order);
    if (!location) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Courier location is not available.',
      });
    }
    return location;
  }

  private async assertOwned(orderId: string, principal: { userId?: string; guestSessionId?: string }) {
    if (!principal.userId && !principal.guestSessionId) {
      throw new NotFoundException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'Authentication required.',
      });
    }
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

  private async toHistory(order: OrderDto): Promise<CustomerOrderHistoryItem> {
    const branch = order.branchId && this.branches
      ? await this.branches.getBranch(order.branchId).catch(() => null)
      : null;
    const names = order.items.map((item) => item.productNameSnapshot);
    const itemSummary =
      names.length === 0
        ? ''
        : names.length === 1
          ? names[0] ?? ''
          : `${names[0]} +${names.length - 1}`;
    return {
      id: order.id,
      displayNumber: displayOrderNumber(order.id),
      status: order.status,
      statusLabel: customerSafeStatusLabel(order.status, order.fulfillmentMode),
      trackerKind: customerTrackerKind(order.status, order.fulfillmentMode),
      fulfillmentMode: order.fulfillmentMode,
      createdAt: order.createdAt.toISOString(),
      currency: order.currency,
      finalPayableMinor: order.finalPayableMinor.toString(),
      itemSummary,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      branch: branch ? { id: branch.id, name: branch.name } : null,
      trackingAvailable: true,
      reorderAvailable: order.items.length > 0,
    };
  }

  private async courierCard(order: OrderDto): Promise<CustomerCourierCard | null> {
    if (order.fulfillmentMode !== 'DELIVERY' || !this.deliveries) return null;
    const delivery = await this.deliveries.getByOrderId(order.id);
    if (!delivery?.courierId) return null;
    const courier = await this.deliveries.getCourier(delivery.courierId).catch(() => null);
    if (!courier) return null;
    return {
      displayName: shortenCourierDisplayName(courier.displayName),
      vehicleType: null,
      callAvailable: false,
      chatAvailable: false,
    };
  }

  private async locationIfEligible(order: OrderDto): Promise<CustomerCourierLocation | null> {
    if (!isCourierLocationEligible(order.status, order.fulfillmentMode) || !this.deliveries) {
      return null;
    }
    const delivery = await this.deliveries.getByOrderId(order.id);
    if (!delivery?.courierId) return null;
    const point = await this.deliveries.getLatestLocation(delivery.id);
    if (!point) return null;
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      recordedAt: point.recordedAt.toISOString(),
      accuracyM: point.accuracyM,
      freshness: locationFreshness(point.recordedAt),
    };
  }
}
