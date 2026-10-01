/**
 * Canonical order lifecycle transitions (document 12).
 *
 * Status is a state machine, not a free-form field. Transitions are
 * validated by backend policy and produce OrderEvent timeline rows.
 */

export const ORDER_STATUSES = [
  'DRAFT',
  'CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'PAID',
  'BRANCH_ASSIGNED',
  'PREPARING',
  'READY_FOR_COURIER',
  'COURIER_ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
  'REJECTED',
  'CANCELLED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Schema default `CREATED` is treated as an early draft alias. */
const START = new Set<OrderStatus>(['DRAFT', 'CREATED']);

const ALLOWED: ReadonlyMap<OrderStatus, readonly OrderStatus[]> = new Map([
  ['DRAFT', ['PAYMENT_PENDING', 'CANCELLED']],
  ['CREATED', ['PAYMENT_PENDING', 'CANCELLED']],
  ['PAYMENT_PENDING', ['PAID', 'PAYMENT_FAILED', 'CANCELLED']],
  ['PAYMENT_FAILED', ['PAYMENT_PENDING', 'CANCELLED']],
  ['PAID', ['BRANCH_ASSIGNED', 'CANCELLED', 'REFUND_PENDING']],
  ['BRANCH_ASSIGNED', ['PREPARING', 'REJECTED', 'CANCELLED']],
  ['PREPARING', ['READY_FOR_COURIER', 'CANCELLED']],
  ['READY_FOR_COURIER', ['COURIER_ASSIGNED', 'CANCELLED']],
  ['COURIER_ASSIGNED', ['PICKED_UP', 'CANCELLED']],
  ['PICKED_UP', ['ON_THE_WAY']],
  ['ON_THE_WAY', ['DELIVERED']],
  ['DELIVERED', ['REFUND_PENDING']],
  ['REJECTED', ['REFUND_PENDING']],
  ['CANCELLED', ['REFUND_PENDING']],
  ['REFUND_PENDING', ['PARTIALLY_REFUNDED', 'REFUNDED']],
  ['PARTIALLY_REFUNDED', ['REFUNDED']],
  ['REFUNDED', []],
]);

export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
  'REFUNDED',
]);

/** Kitchen board shows fulfillment-in-progress orders for a branch. */
export const KITCHEN_BOARD_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'BRANCH_ASSIGNED',
  'PREPARING',
  'READY_FOR_COURIER',
]);

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const next = ALLOWED.get(from);
  if (!next) return false;
  return next.includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order transition ${from} -> ${to}`);
  }
}

export function isStartStatus(status: OrderStatus): boolean {
  return START.has(status);
}
