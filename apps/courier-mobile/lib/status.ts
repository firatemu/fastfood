/**
 * Courier delivery status rules — the single source of truth shared by every
 * courier-mobile screen.
 *
 * The web courier surface (`apps/courier-web/src/app/deliveries/[deliveryId]`)
 * derives the available action from a single `actionByStatus` map rather than
 * rendering every transition at once. That map is the business rule: a courier
 * may only perform the *one* transition that is legal from the current status,
 * so the lifecycle cannot be skipped from the UI.
 *
 * Keeping it here — instead of inline in the screen — means the list badge, the
 * detail action button and the tests all agree on the same rule.
 */
import type { CourierDeliveryStatus } from '@fastfood/contracts';
import type { StatusTone } from '@fastfood/ui-native';

/**
 * Ordered happy path. A delivery that is not `DELIVERED` has not completed all
 * of these; `CANCELLED` sits outside this list entirely.
 */
export const DELIVERY_LIFECYCLE = [
  'ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
] as const satisfies readonly CourierDeliveryStatus[];

/** Human labels, matching the web courier surface wording. */
export const STATUS_LABELS: Record<CourierDeliveryStatus, string> = {
  UNASSIGNED: 'Atama bekliyor',
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Şubeden alındı',
  ON_THE_WAY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
};

/** Compact labels for dense surfaces such as list rows. */
export const STATUS_SHORT_LABELS: Record<CourierDeliveryStatus, string> = {
  UNASSIGNED: 'Bekliyor',
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Alındı',
  ON_THE_WAY: 'Yolda',
  DELIVERED: 'Teslim',
  CANCELLED: 'İptal',
};

/**
 * Badge tone per status. `DELIVERED` and `CANCELLED` are the two terminal
 * outcomes and must never share a tone with an in-flight status.
 */
export const STATUS_TONES: Record<CourierDeliveryStatus, StatusTone> = {
  UNASSIGNED: 'pending',
  ASSIGNED: 'ready',
  PICKED_UP: 'in_progress',
  ON_THE_WAY: 'in_progress',
  DELIVERED: 'completed',
  CANCELLED: 'cancelled',
};

/** Step captions for the delivery progress stepper. */
export const LIFECYCLE_STEP_LABELS = [
  'Atama alındı',
  'Şubeden alındı',
  'Yola çıktı',
  'Teslim edildi',
] as const;

export interface DeliveryAction {
  /** Path segment appended to `/courier/deliveries/{id}/`. */
  readonly path: string;
  /** Button caption. */
  readonly label: string;
  /** Confirmation shown after the transition succeeds. */
  readonly successLabel: string;
}

/**
 * The single legal transition out of each status. A status that is absent has
 * no outgoing action: `UNASSIGNED`, `DELIVERED` and `CANCELLED` are all
 * terminal from the courier's point of view, so the UI must offer no button
 * rather than a disabled one.
 */
export const NEXT_ACTIONS: Partial<Record<CourierDeliveryStatus, DeliveryAction>> = {
  ASSIGNED: { path: 'pickup', label: 'Şubeden teslim aldım', successLabel: 'Şubeden teslim alındı.' },
  PICKED_UP: { path: 'on-the-way', label: 'Yola çıktım', successLabel: 'Teslimat yola çıktı.' },
  ON_THE_WAY: { path: 'deliver', label: 'Teslim edildi', successLabel: 'Teslimat teslim edildi.' },
};

export function isTerminalStatus(status: CourierDeliveryStatus): boolean {
  return NEXT_ACTIONS[status] === undefined;
}

export function nextActionFor(status: CourierDeliveryStatus): DeliveryAction | undefined {
  return NEXT_ACTIONS[status];
}

export function statusLabel(status: CourierDeliveryStatus): string {
  return STATUS_LABELS[status];
}

export function toneForStatus(status: CourierDeliveryStatus): StatusTone {
  return STATUS_TONES[status];
}

/**
 * Index into {@link LIFECYCLE_STEP_LABELS} for the progress stepper.
 *
 * `DELIVERED` returns the step count so every step renders as complete, which
 * is what the web surface shows. `CANCELLED` and `UNASSIGNED` return `-1` so no
 * step is presented as reached.
 */
export function lifecycleStepIndex(status: CourierDeliveryStatus): number {
  if (status === 'CANCELLED' || status === 'UNASSIGNED') return -1;
  if (status === 'DELIVERED') return DELIVERY_LIFECYCLE.length;
  return DELIVERY_LIFECYCLE.indexOf(status);
}