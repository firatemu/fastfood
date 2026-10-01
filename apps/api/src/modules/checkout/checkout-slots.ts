/**
 * Eligible scheduled slots derived from branch operating hours.
 * Times are stored as UTC instants; business clock is Europe/Istanbul.
 */

export interface OperatingHourRow {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface EligibleSlot {
  startAt: string;
  label: string;
}

export const BUSINESS_TIMEZONE = 'Europe/Istanbul';
export const PREP_MINUTES = 20;
export const SLOT_STEP_MINUTES = 30;
export const HORIZON_HOURS = 4;

const WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function istanbulParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dow: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    dow: WEEKDAY_TO_DOW[map.weekday ?? 'Mon'] ?? 1,
  };
}

/** Istanbul is UTC+3 year-round. */
export function istanbulWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0));
}

function parseHm(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map((part) => Number(part));
  return { hour: h ?? 0, minute: m ?? 0 };
}

function findHours(
  hours: readonly OperatingHourRow[],
  dow: number,
): OperatingHourRow | undefined {
  return hours.find((row) => row.dayOfWeek === dow);
}

function formatSlotLabel(iso: string): string {
  const date = new Date(iso);
  const fmt = new Intl.DateTimeFormat('tr-TR', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return fmt.format(date);
}

function ceilToStep(date: Date, stepMinutes: number): Date {
  const ms = date.getTime();
  const step = stepMinutes * 60_000;
  return new Date(Math.ceil(ms / step) * step);
}

/**
 * Eligible 30-minute slots from now+prep until min(close, now+horizon).
 * Empty when the branch is closed or no remaining window exists.
 */
export function listEligibleSlots(input: {
  now: Date;
  hours: readonly OperatingHourRow[];
}): EligibleSlot[] {
  const parts = istanbulParts(input.now);
  const today = findHours(input.hours, parts.dow);
  if (!today || today.isClosed) return [];

  const open = parseHm(today.opensAt);
  const close = parseHm(today.closesAt);
  const openUtc = istanbulWallToUtc(parts.year, parts.month, parts.day, open.hour, open.minute);
  let closeUtc = istanbulWallToUtc(parts.year, parts.month, parts.day, close.hour, close.minute);
  if (closeUtc <= openUtc) {
    closeUtc = new Date(closeUtc.getTime() + 24 * 60 * 60 * 1000);
  }

  const earliest = new Date(Math.max(input.now.getTime() + PREP_MINUTES * 60_000, openUtc.getTime()));
  const horizon = new Date(input.now.getTime() + HORIZON_HOURS * 60 * 60 * 1000);
  const last = new Date(Math.min(closeUtc.getTime(), horizon.getTime()));
  let cursor = ceilToStep(earliest, SLOT_STEP_MINUTES);
  const slots: EligibleSlot[] = [];
  while (cursor.getTime() + SLOT_STEP_MINUTES * 60_000 <= last.getTime() + 1) {
    if (cursor >= openUtc && cursor < closeUtc) {
      const startAt = cursor.toISOString();
      slots.push({ startAt, label: formatSlotLabel(startAt) });
    }
    cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60_000);
  }
  return slots;
}

export function isEligibleScheduledInstant(
  scheduledFor: Date,
  hours: readonly OperatingHourRow[],
  now: Date,
): boolean {
  const slots = listEligibleSlots({ now, hours });
  const target = scheduledFor.getTime();
  return slots.some((slot) => Math.abs(new Date(slot.startAt).getTime() - target) < 60_000);
}
