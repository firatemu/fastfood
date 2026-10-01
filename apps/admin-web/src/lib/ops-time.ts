export const ISTANBUL_TZ = 'Europe/Istanbul';

export function istanbulCalendarDate(value: Date | string, timeZone = ISTANBUL_TZ): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isIstanbulToday(value: Date | string, now = new Date()): boolean {
  return istanbulCalendarDate(value) === istanbulCalendarDate(now);
}

export function formatOpsDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: ISTANBUL_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatElapsed(from: Date | string, now = new Date()): string {
  const start = typeof from === 'string' ? new Date(from) : from;
  if (Number.isNaN(start.getTime())) return '—';
  const minutes = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} sa ${rest} dk`;
}

export function formatSyncAge(at: number | null, now = Date.now()): string {
  if (at == null) return 'Henüz senkron yok';
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 5) return 'Az önce';
  if (seconds < 60) return `${seconds} sn önce`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} dk önce`;
}

export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
