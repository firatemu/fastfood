/**
 * Pure helpers shared between the orders datagrid component and its
 * unit tests. Kept in a `.ts` (no JSX) module so Vitest can import it
 * without paying the cost of parsing the JSX tree.
 */
import { allowedTransitions } from '../../lib/order-status';

/**
 * Inline FSM labels. Mirrors `ACTION_LABELS` from the order detail page
 * so an operator sees the exact same wording whether they act from the
 * detail panel or from a datagrid row dropdown.
 */
export const INLINE_TRANSITION_LABELS: Record<string, string> = {
  PREPARING: 'Hazırlığa al',
  READY_FOR_COURIER: 'Paketlendi olarak işaretle',
  COURIER_ASSIGNED: 'Kurye atandı',
  PICKED_UP: 'Kurye aldı',
  ON_THE_WAY: 'Yola çıktı',
  DELIVERED: 'Teslim edildi',
  REJECTED: 'Reddet',
  CANCELLED: 'İptal et',
};

/**
 * Negative transitions the datagrid dropdown should expose explicitly.
 * These bubble to the bottom of the menu so a hurried operator sees the
 * happy path first.
 */
const NEGATIVE_ACTIONS = new Set(['REJECTED', 'CANCELLED']);

export interface AllowedTransition {
  toStatus: string;
  label: string;
  variant: 'primary' | 'warning';
}

/**
 * Pure helper used by both the column renderer and the unit test.
 * Filters transitions to those that have an inline label, then sorts
 * negative actions at the bottom so a hurried operator sees the happy
 * path first.
 */
export function computeAllowedTransitions(status: string): AllowedTransition[] {
  const transitions = allowedTransitions(status);
  const labelled = transitions.filter((t) => t in INLINE_TRANSITION_LABELS);
  labelled.sort((a, b) => {
    const aNeg = NEGATIVE_ACTIONS.has(a) ? 1 : 0;
    const bNeg = NEGATIVE_ACTIONS.has(b) ? 1 : 0;
    if (aNeg !== bNeg) return aNeg - bNeg;
    return 0;
  });
  return labelled.map((toStatus) => ({
    toStatus,
    label: INLINE_TRANSITION_LABELS[toStatus] ?? toStatus,
    variant: NEGATIVE_ACTIONS.has(toStatus) ? 'warning' : 'primary',
  }));
}

/**
 * SLA + age projection for the SLA chip. Pure helper.
 *  - `active` = whether the order is still in fulfillment
 *  - `breached` = whether the active step's SLA budget was exceeded
 *  - `ageMinutes` rounds to whole minutes
 *
 * `slaMinutes` falls back to null when the status has no known budget
 * (e.g. terminal states), in which case the chip renders "—".
 */
export interface SlaState {
  ageMinutes: number;
  slaMinutes: number | null;
  breached: boolean;
}

export function deriveSlaState(
  status: string,
  createdAt: string | null | undefined,
  nowMs: number,
  budgetByStatus: Readonly<Record<string, number | null>>,
): SlaState {
  const ms = createdAt ? new Date(createdAt).getTime() : NaN;
  const ageMinutes =
    Number.isFinite(ms) && ms > 0 ? Math.max(0, Math.floor((nowMs - ms) / 60_000)) : 0;
  const sla = Object.prototype.hasOwnProperty.call(budgetByStatus, status)
    ? budgetByStatus[status]
    : undefined;
  const slaMinutes = typeof sla === 'number' ? sla : null;
  const breached = slaMinutes !== null && slaMinutes > 0 && ageMinutes > slaMinutes;
  return { ageMinutes, slaMinutes, breached };
}

export const DEFAULT_SLA_BUDGET: Readonly<Record<string, number | null>> = {
  PAID: 3,
  BRANCH_ASSIGNED: 3,
  PREPARING: 14,
  READY_FOR_COURIER: 6,
  COURIER_ASSIGNED: 5,
  PICKED_UP: 5,
  ON_THE_WAY: 25,
};

/**
 * Order timeline entry shape. Mirrors `OrderEventDto` from the API and
 * `OrderAuditTrail` consumed on the detail page.
 */
export interface TimelineEntry {
  id: string;
  eventType: string;
  fromStatus: string | null | undefined;
  toStatus: string | null | undefined;
  createdAt: string;
}

/**
 * End-of-life status set used to recognise a "delivered/cancelled"
 * event when computing total elapsed duration.
 */
const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED']);

export type ElapsedTone = 'completed' | 'ongoing' | null;

/**
 * Total-elapsed projection:
 *  - completed orders: `createdAt` → first terminal event timestamp.
 *  - non-terminal orders: no projection (returns null).
 *
 * Returns the duration in whole minutes plus a stable tone for the chip.
 */
export interface ElapsedState {
  minutes: number;
  tone: ElapsedTone;
}

export function deriveElapsedState(
  createdAt: string | null | undefined,
  events: readonly TimelineEntry[] | readonly Record<string, unknown>[] | null | undefined,
  nowMs?: number | null,
): ElapsedState | null {
  if (!createdAt) return null;
  const startMs = new Date(createdAt).getTime();
  if (!Number.isFinite(startMs) || startMs <= 0) return null;

  let endMs: number | null = null;
  let completed = false;
  if (events) {
    const terminal = events.find((e) => {
      const to = (e as { toStatus?: unknown }).toStatus;
      return typeof to === 'string' && TERMINAL_STATUSES.has(to);
    });
    if (terminal) {
      const createdAtField = (terminal as { createdAt?: unknown }).createdAt;
      if (typeof createdAtField === 'string') {
        const parsed = new Date(createdAtField).getTime();
        if (Number.isFinite(parsed) && parsed > 0) {
          endMs = parsed;
          completed = true;
        }
      }
    }
  }
  if (endMs === null) {
    if (nowMs == null || !Number.isFinite(nowMs)) return null;
    endMs = nowMs;
  }
  const clampedEnd = endMs < startMs ? startMs : endMs;

  const minutes = Math.max(0, Math.floor((clampedEnd - startMs) / 60_000));
  return { minutes, tone: completed ? 'completed' : 'ongoing' };
}

/**
 * Human-readable formatter: 75 → "1s 15dk", 12 → "12 dk", 0 → "0 dk".
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes - hours * 60;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

/**
 * Order timeline → icon + label pair for the modal list. We keep the
 * mapping here so the unit test can cover the wording without rendering
 * the dialog.
 */
export interface TimelineRow {
  id: string;
  icon: string;
  title: string;
  detail: string;
  tone: 'info' | 'success' | 'danger' | 'muted';
}

const TIMELINE_LABELS: Readonly<Record<string, string>> = {
  OrderCreated: 'Sipariş oluşturuldu',
  OrderStatusChanged: 'Durum güncellendi',
  OrderBranchAssigned: 'Şube atandı',
  OrderBranchReassigned: 'Şube yeniden atandı',
  OrderBranchAccepted: 'Şube kabul etti',
  OrderCancelled: 'İptal edildi',
  OrderRejected: 'Reddedildi',
  OrderDelivered: 'Teslim edildi',
  OrderPaymentCaptured: 'Ödeme tahsil edildi',
  OrderPaymentFailed: 'Ödeme başarısız',
  OrderRefundRequested: 'İade talebi açıldı',
  OrderRefundCompleted: 'İade tamamlandı',
};

const TIMELINE_ICONS: Readonly<Record<string, string>> = {
  OrderCreated: 'add_circle',
  OrderStatusChanged: 'arrow_circle_right',
  OrderBranchAssigned: 'storefront',
  OrderBranchReassigned: 'sync_alt',
  OrderBranchAccepted: 'check_circle',
  OrderCancelled: 'cancel',
  OrderRejected: 'block',
  OrderDelivered: 'task_alt',
  OrderPaymentCaptured: 'credit_card',
  OrderPaymentFailed: 'credit_card_off',
  OrderRefundRequested: 'undo',
  OrderRefundCompleted: 'currency_exchange',
};

const STATUS_TITLE: Readonly<Record<string, string>> = {
  PAID: 'Ödendi',
  BRANCH_ASSIGNED: 'Şubeye atandı',
  PREPARING: 'Hazırlanıyor',
  READY_FOR_COURIER: 'Paketlendi',
  COURIER_ASSIGNED: 'Kurye atandı',
  PICKED_UP: 'Kurye aldı',
  ON_THE_WAY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal edildi',
  REJECTED: 'Reddedildi',
  REFUND_PENDING: 'İade bekliyor',
  PARTIALLY_REFUNDED: 'Kısmi iade',
  REFUNDED: 'İade edildi',
};

function statusTitleLookup(status: string | null | undefined): string | null {
  if (!status) return null;
  return STATUS_TITLE[status] ?? status;
}

export function timelineIcon(eventType: string): string {
  return TIMELINE_ICONS[eventType] ?? 'event_note';
}

export function timelineTitle(eventType: string): string {
  return TIMELINE_LABELS[eventType] ?? eventType;
}

/**
 * Build the visible timeline rows. Entries are sorted oldest → newest
 * to mirror the detail page's `OrderAuditTrail`. Rows missing a
 * recognised eventType still get a row — we surface them as
 * `tone: 'muted'`.
 */
export function buildTimelineRows(events: readonly TimelineEntry[]): TimelineRow[] {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => {
    const aMs = new Date(a.createdAt).getTime();
    const bMs = new Date(b.createdAt).getTime();
    if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
    return aMs - bMs;
  });
  return sorted.map((entry) => {
    const createdAt = formatTimelineTime(entry.createdAt);
    const fromTitle = statusTitleLookup(entry.fromStatus);
    const toTitle = statusTitleLookup(entry.toStatus);
    let detail = createdAt;
    if (fromTitle || toTitle) {
      const fromLabel = fromTitle ?? '—';
      const toLabel = toTitle ?? '—';
      detail =
        fromTitle && toTitle && fromTitle !== toTitle
          ? `${createdAt} · ${fromLabel} → ${toLabel}`
          : `${createdAt} · ${toLabel}`;
    }
    return {
      id: entry.id,
      icon: timelineIcon(entry.eventType),
      title: timelineTitle(entry.eventType),
      detail,
      tone: statusToneForEvent(entry.eventType, entry.toStatus),
    };
  });
}

function statusToneForEvent(
  eventType: string,
  toStatus: string | null | undefined,
): TimelineRow['tone'] {
  if (toStatus === 'DELIVERED' || eventType === 'OrderDelivered') return 'success';
  if (
    toStatus === 'CANCELLED' ||
    toStatus === 'REJECTED' ||
    toStatus === 'REFUNDED' ||
    eventType === 'OrderCancelled' ||
    eventType === 'OrderRejected'
  ) {
    return 'danger';
  }
  if (eventType === 'OrderCreated') return 'info';
  return 'muted';
}

/** Format ISO timestamp into a stable tr-TR "dd MMM HH:mm" string. */
export function formatTimelineTime(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return iso;
  const date = new Date(ms);
  const dd = String(date.getDate()).padStart(2, '0');
  const months = [
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara',
  ];
  const month = months[date.getMonth()] ?? '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${dd} ${month} ${hh}:${mm}`;
}
