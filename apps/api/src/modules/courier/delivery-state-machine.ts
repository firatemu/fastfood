/**
 * Delivery lifecycle states (document 15 §5).
 */

export const DELIVERY_STATUSES = [
  'UNASSIGNED',
  'ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
  'CANCELLED',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

const ALLOWED: ReadonlyMap<DeliveryStatus, readonly DeliveryStatus[]> = new Map([
  ['UNASSIGNED', ['ASSIGNED', 'CANCELLED']],
  ['ASSIGNED', ['PICKED_UP', 'UNASSIGNED', 'CANCELLED']],
  ['PICKED_UP', ['ON_THE_WAY', 'CANCELLED']],
  ['ON_THE_WAY', ['DELIVERED', 'CANCELLED']],
  ['DELIVERED', []],
  ['CANCELLED', []],
]);

export function canDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return ALLOWED.get(from)?.includes(to) ?? false;
}

export const ACTIVE_DELIVERY_STATUSES: ReadonlySet<DeliveryStatus> = new Set([
  'ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
]);
