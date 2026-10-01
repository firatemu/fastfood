import type { OrderStatus } from './order-state-machine.js';

export const STITCH_TRACKER_STAGES = [
  { index: 0, key: 'received', label: 'Sipariş Alındı', pickupLabel: 'Sipariş Alındı' },
  { index: 1, key: 'grilling', label: 'Döküm Izgarada', pickupLabel: 'Döküm Izgarada' },
  { index: 2, key: 'courier', label: 'Kurye Yolda', pickupLabel: 'Teslime Hazır' },
  { index: 3, key: 'delivered', label: 'Teslim Edildi', pickupLabel: 'Teslim Alındı' },
] as const;

export const COURIER_LOCATION_STALE_MS = 90_000;
export const TRACKING_POLL_INTERVAL_MS = 8_000;

export const LOCATION_ELIGIBLE_STATUSES: ReadonlySet<string> = new Set([
  'COURIER_ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
]);

export const NEGATIVE_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'CANCELLED',
  'REJECTED',
  'PAYMENT_FAILED',
]);

export const COMPLETED_STATUSES: ReadonlySet<string> = new Set(['DELIVERED']);

export type CustomerTrackerKind =
  | 'progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'failed'
  | 'unavailable';

export type LocationFreshness = 'current' | 'stale' | 'unavailable';

export interface CustomerEta {
  kind: 'delivery' | 'pickup' | 'none';
  remainingMinutes: number | null;
  estimatedAt: string | null;
  source: 'branch_estimate' | 'scheduled_for' | 'terminal';
}

export function customerTrackerKind(
  status: string,
  _fulfillmentMode: 'DELIVERY' | 'PICKUP' = 'DELIVERY',
): CustomerTrackerKind {
  const s = status.toUpperCase();
  if (s === 'CANCELLED') return 'cancelled';
  if (s === 'REJECTED') return 'rejected';
  if (
    s === 'PAYMENT_FAILED' ||
    s === 'REFUND_PENDING' ||
    s === 'REFUNDED' ||
    s === 'PARTIALLY_REFUNDED'
  ) {
    return s === 'PAYMENT_FAILED' ? 'failed' : 'failed';
  }
  if (s === 'DELIVERED') return 'completed';
  if (s === 'DRAFT' || s === 'CREATED') return 'progress';
  return 'progress';
}

export function mapOrderStatusToStitchStepperIndex(
  status: string,
  fulfillmentMode: 'DELIVERY' | 'PICKUP' = 'DELIVERY',
): number {
  const kind = customerTrackerKind(status, fulfillmentMode);
  if (kind === 'cancelled' || kind === 'rejected' || kind === 'failed') return -1;
  const s = status.toUpperCase();
  if (s === 'DELIVERED' || s === 'REFUNDED' || s === 'PARTIALLY_REFUNDED') return 3;
  if (fulfillmentMode === 'PICKUP') {
    if (
      s === 'READY_FOR_COURIER' ||
      s === 'COURIER_ASSIGNED' ||
      s === 'PICKED_UP' ||
      s === 'ON_THE_WAY'
    ) {
      return 2;
    }
    if (s === 'PREPARING' || s === 'BRANCH_ACCEPTED') return 1;
    if (s === 'BRANCH_ASSIGNED' || s === 'PAID') return 0;
    return 0;
  }
  if (s === 'ON_THE_WAY' || s === 'PICKED_UP' || s === 'COURIER_ASSIGNED') return 2;
  if (s === 'READY_FOR_COURIER' || s === 'PREPARING' || s === 'BRANCH_ACCEPTED') return 1;
  if (s === 'BRANCH_ASSIGNED' || s === 'PAID') return 0;
  return 0;
}

export function locationFreshness(
  recordedAt: Date | string | null | undefined,
  nowMs = Date.now(),
  staleMs = COURIER_LOCATION_STALE_MS,
): LocationFreshness {
  if (!recordedAt) return 'unavailable';
  const ts = typeof recordedAt === 'string' ? Date.parse(recordedAt) : recordedAt.getTime();
  if (!Number.isFinite(ts)) return 'unavailable';
  return nowMs - ts > staleMs ? 'stale' : 'current';
}

export function isCourierLocationEligible(
  status: string,
  fulfillmentMode: 'DELIVERY' | 'PICKUP',
): boolean {
  return fulfillmentMode === 'DELIVERY' && LOCATION_ELIGIBLE_STATUSES.has(status.toUpperCase());
}

export function deriveCustomerEta(input: {
  status: string;
  fulfillmentMode: 'DELIVERY' | 'PICKUP';
  scheduledFor?: Date | null;
  createdAt?: Date;
  estimatedDeliveryMinutesMin?: number | null;
  estimatedDeliveryMinutesMax?: number | null;
  now?: Date;
}): CustomerEta {
  const now = input.now ?? new Date();
  const kind = customerTrackerKind(input.status, input.fulfillmentMode);
  if (kind === 'cancelled' || kind === 'rejected' || kind === 'failed') {
    return { kind: 'none', remainingMinutes: null, estimatedAt: null, source: 'terminal' };
  }
  if (kind === 'completed') {
    return {
      kind: input.fulfillmentMode === 'PICKUP' ? 'pickup' : 'delivery',
      remainingMinutes: 0,
      estimatedAt: now.toISOString(),
      source: 'terminal',
    };
  }
  if (input.scheduledFor && input.scheduledFor.getTime() > now.getTime()) {
    const remainingMinutes = Math.max(
      1,
      Math.ceil((input.scheduledFor.getTime() - now.getTime()) / 60_000),
    );
    return {
      kind: input.fulfillmentMode === 'PICKUP' ? 'pickup' : 'delivery',
      remainingMinutes,
      estimatedAt: input.scheduledFor.toISOString(),
      source: 'scheduled_for',
    };
  }
  const min = input.estimatedDeliveryMinutesMin ?? 25;
  const max = input.estimatedDeliveryMinutesMax ?? 35;
  const stepper = mapOrderStatusToStitchStepperIndex(input.status, input.fulfillmentMode);
  let remaining: number;
  if (stepper <= 0) remaining = max;
  else if (stepper === 1) remaining = min;
  else if (stepper === 2) remaining = Math.max(5, Math.round(min * 0.4));
  else remaining = 0;
  const estimatedAt = new Date(now.getTime() + remaining * 60_000);
  return {
    kind: input.fulfillmentMode === 'PICKUP' ? 'pickup' : 'delivery',
    remainingMinutes: remaining,
    estimatedAt: estimatedAt.toISOString(),
    source: 'branch_estimate',
  };
}

export function shortenCourierDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Kurye';
  if (parts.length === 1) return parts[0] ?? 'Kurye';
  const last = parts[parts.length - 1] ?? '';
  const initial = last.charAt(0).toUpperCase();
  return `${parts[0]} ${initial}.`;
}

export function customerSafeStatusLabel(
  status: string,
  fulfillmentMode: 'DELIVERY' | 'PICKUP' = 'DELIVERY',
): string {
  const s = status.toUpperCase();
  if (s === 'CANCELLED') return 'İptal edildi';
  if (s === 'REJECTED') return 'Şube reddetti';
  if (s === 'PAYMENT_FAILED') return 'Ödeme başarısız';
  if (s === 'DELIVERED') return fulfillmentMode === 'PICKUP' ? 'Teslim alındı' : 'Teslim edildi';
  if (s === 'ON_THE_WAY' || s === 'PICKED_UP') return 'Kurye yolda';
  if (s === 'COURIER_ASSIGNED') return 'Kurye atandı';
  if (s === 'READY_FOR_COURIER') {
    return fulfillmentMode === 'PICKUP' ? 'Teslime hazır' : 'Kurye için hazır';
  }
  if (s === 'PREPARING' || s === 'BRANCH_ACCEPTED') return 'Döküm ızgarada';
  if (s === 'BRANCH_ASSIGNED' || s === 'PAID') return 'Sipariş alındı';
  if (s === 'PAYMENT_PENDING' || s === 'CREATED' || s === 'DRAFT') return 'Ödeme bekleniyor';
  return s;
}

export function displayOrderNumber(orderId: string): string {
  return `#${orderId.replace(/-/g, '').slice(-6).toUpperCase()}`;
}

export function isTrackingActive(status: string): boolean {
  const kind = customerTrackerKind(status);
  return kind === 'progress';
}

export function customerSafeTimelineEvent(event: {
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date;
  payloadJson: Record<string, unknown> | null;
}): {
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  customerReason: string | null;
} {
  const payload = event.payloadJson ?? {};
  const rawReason = typeof payload.reason === 'string' ? payload.reason : null;
  const customerReason =
    rawReason && !/internal|operator|staff|admin|kitchen/i.test(rawReason) ? rawReason : null;
  return {
    eventType: event.eventType,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    createdAt: event.createdAt.toISOString(),
    customerReason,
  };
}

export type { OrderStatus };
