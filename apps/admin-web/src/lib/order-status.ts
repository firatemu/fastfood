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

export type StatusTone = 'ready' | 'warn' | 'critical' | 'logistics' | 'idle' | 'amber';

export type KdsLaneId = 'new' | 'prep' | 'ready';

const LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  CREATED: 'Oluşturuldu',
  PAYMENT_PENDING: 'Ödeme bekliyor',
  PAYMENT_FAILED: 'Ödeme başarısız',
  PAID: 'Ödendi',
  BRANCH_ASSIGNED: 'Şubeye atandı',
  PREPARING: 'Hazırlanıyor',
  READY_FOR_COURIER: 'Paketlendi',
  COURIER_ASSIGNED: 'Kurye atandı',
  PICKED_UP: 'Alındı',
  ON_THE_WAY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  REJECTED: 'Reddedildi',
  CANCELLED: 'İptal',
  REFUND_PENDING: 'İade bekliyor',
  PARTIALLY_REFUNDED: 'Kısmi iade',
  REFUNDED: 'İade edildi',
};

export const ORDER_STATUS_LABEL = LABELS;

const TONES: Record<string, StatusTone> = {
  DRAFT: 'idle',
  CREATED: 'idle',
  PAYMENT_PENDING: 'warn',
  PAYMENT_FAILED: 'critical',
  PAID: 'ready',
  BRANCH_ASSIGNED: 'warn',
  PREPARING: 'amber',
  READY_FOR_COURIER: 'ready',
  COURIER_ASSIGNED: 'logistics',
  PICKED_UP: 'logistics',
  ON_THE_WAY: 'logistics',
  DELIVERED: 'ready',
  REJECTED: 'critical',
  CANCELLED: 'critical',
  REFUND_PENDING: 'warn',
  PARTIALLY_REFUNDED: 'warn',
  REFUNDED: 'idle',
};

const ALLOWED: ReadonlyMap<string, readonly string[]> = new Map([
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

export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
  'REFUNDED',
]);

export const KITCHEN_BOARD_STATUSES: ReadonlySet<string> = new Set([
  'BRANCH_ASSIGNED',
  'PREPARING',
  'READY_FOR_COURIER',
]);

export const ACTIVE_ORDER_STATUSES: ReadonlySet<string> = new Set(
  ORDER_STATUSES.filter((s) => !TERMINAL_STATUSES.has(s) && s !== 'DRAFT'),
);

export const STATUS_GROUPS = {
  active: [
    'PAYMENT_PENDING',
    'PAID',
    'BRANCH_ASSIGNED',
    'PREPARING',
    'READY_FOR_COURIER',
    'COURIER_ASSIGNED',
    'PICKED_UP',
    'ON_THE_WAY',
    'REFUND_PENDING',
    'PARTIALLY_REFUNDED',
  ] as const,
  waiting: ['BRANCH_ASSIGNED', 'PREPARING', 'READY_FOR_COURIER', 'COURIER_ASSIGNED'] as const,
  completed: ['DELIVERED'] as const,
  refunded: ['REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const,
} satisfies Record<string, readonly OrderStatus[]>;

export type StatusGroupId = keyof typeof STATUS_GROUPS;

const PAYMENT_LABELS: Record<string, string> = {
  PAID: 'Ödendi',
  PENDING: 'Bekliyor',
  FAILED: 'Başarısız',
  REFUND_PENDING: 'İade bekliyor',
  PARTIALLY_REFUNDED: 'Kısmi iade',
  REFUNDED: 'İade edildi',
};

export function paymentLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return PAYMENT_LABELS[status] ?? status;
}

export type PaymentTone = 'ready' | 'warn' | 'critical' | 'idle' | 'amber';

const PAYMENT_TONES: Record<string, PaymentTone> = {
  PAID: 'ready',
  PENDING: 'warn',
  FAILED: 'critical',
  REFUND_PENDING: 'warn',
  PARTIALLY_REFUNDED: 'warn',
  REFUNDED: 'idle',
};

export function paymentTone(status: string | null | undefined): PaymentTone {
  if (!status) return 'idle';
  return PAYMENT_TONES[status] ?? 'idle';
}

export function statusGroupOf(status: string): StatusGroupId | null {
  if ((STATUS_GROUPS.active as readonly string[]).includes(status)) return 'active';
  if ((STATUS_GROUPS.waiting as readonly string[]).includes(status)) return 'waiting';
  if ((STATUS_GROUPS.completed as readonly string[]).includes(status)) return 'completed';
  if ((STATUS_GROUPS.refunded as readonly string[]).includes(status)) return 'refunded';
  return null;
}

export function orderStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function orderStatusTone(status: string): StatusTone {
  return TONES[status] ?? 'idle';
}

export function allowedTransitions(from: string): readonly string[] {
  return ALLOWED.get(from) ?? [];
}

export function kdsLane(status: string): KdsLaneId | null {
  if (status === 'BRANCH_ASSIGNED') return 'new';
  if (status === 'PREPARING') return 'prep';
  if (status === 'READY_FOR_COURIER') return 'ready';
  return null;
}

export const KDS_LANES: { id: KdsLaneId; title: string }[] = [
  { id: 'new', title: 'Yeni siparişler' },
  { id: 'prep', title: 'Izgara & hazırlanıyor' },
  { id: 'ready', title: 'Hazır / paketlendi' },
];

export function fulfillmentLabel(mode: string | undefined): string {
  if (mode === 'PICKUP') return 'Gel-al';
  if (mode === 'DELIVERY') return 'Teslimat';
  return '—';
}

export function kitchenPrimaryAction(status: string): { toStatus: string; label: string } | null {
  if (status === 'BRANCH_ASSIGNED') return { toStatus: 'PREPARING', label: 'Hazırlığa al' };
  if (status === 'PREPARING') return { toStatus: 'READY_FOR_COURIER', label: 'Paketle' };
  return null;
}

export function canCancelFromKitchen(status: string): boolean {
  return allowedTransitions(status).includes('CANCELLED');
}

export function canReassignBranch(status: string): boolean {
  if (TERMINAL_STATUSES.has(status)) return false;
  return status !== 'PICKED_UP' && status !== 'ON_THE_WAY';
}

export function canAssignCourier(status: string): boolean {
  return status === 'READY_FOR_COURIER';
}

/**
 * Maps an order status to the active index in the admin OrderFlowRail.
 *
 * The rail's PRIMARY_STEPS list has FIVE entries (PREPARING,
 * READY_FOR_COURIER, COURIER_ASSIGNED, ON_THE_WAY, DELIVERED) per
 * ADR-012. There is an implicit "Ödeme alındı" preamble that lives
 * before the first visual step but does not take its own index.
 *
 * `BRANCH_ASSIGNED` and `PAID` map to index 1 so the rail's first
 * visible step ("Hazırlanıyor") activates as soon as the order is
 * received — paying and branch selection are auto-completed. The
 * actual PREPARING transition happens when the branch operator runs
 * the "Hazırlığa al" action; visible state does not change between
 * `BRANCH_ASSIGNED` and `PREPARING`.
 *
 * `PICKED_UP` is absorbed into `COURIER_ASSIGNED` for the rail view
 * — the courier picks up the package on the same operational beat
 * as being assigned to it. Terminal / negative states map to the
 * last index so the rail fills when an order reaches a terminal
 * outcome.
 */
export const RAIL_STEP_COUNT = 6;

const RAIL_INDEX_BY_STATUS: Readonly<Record<string, number>> = {
  // The implicit pre-rail "Ödeme alındı" stage; we keep `0` reserved so
  // it never collides with a visible step index. Unused in JSX.
  PAID: 1,
  BRANCH_ASSIGNED: 1,
  // Backward-compat: historical rows may still carry BRANCH_ACCEPTED
  // (ADR-011). ADR-012 collapses it to the PREPARING equivalent for
  // the rail view.
  BRANCH_ACCEPTED: 1,
  PREPARING: 1,
  READY_FOR_COURIER: 2,
  COURIER_ASSIGNED: 3,
  PICKED_UP: 3,
  ON_THE_WAY: 4,
  DELIVERED: 5,
  CANCELLED: 5,
  REJECTED: 5,
  REFUND_PENDING: 5,
  PARTIALLY_REFUNDED: 5,
  REFUNDED: 5,
};

export function railIndexForStatus(status: string): number {
  if (status in RAIL_INDEX_BY_STATUS) {
    return RAIL_INDEX_BY_STATUS[status] ?? 1;
  }
  return 1;
}
