export function formatDeliveryWindow(min: number, max: number): string | null {
  if (min <= 0 && max <= 0) return null;
  if (min > 0 && max > 0) return `${min}-${max} dk`;
  return `${max > 0 ? max : min} dk`;
}

export function formatHappyCustomers(count: number): string | null {
  if (count <= 0) return null;
  return `${count.toLocaleString('tr-TR')}+`;
}

export function formatBranchLocation(name: string, addressLine: string): string {
  const parts = addressLine
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const city = parts[parts.length - 1];
  if (city && !name.toLowerCase().includes(city.toLowerCase())) {
    return `${name}, ${city}`;
  }
  return name;
}

export function formatExpressLabel(name: string): string {
  const first = name.split(/\s+/)[0];
  return `${first ?? name} Ekspres`;
}

export function formatSoldCount(count: number): string {
  if (count <= 0) return '';
  return `${count.toLocaleString('tr-TR')}+`;
}

export function formatRatingBps(bps: number | null): string | null {
  if (bps === null || bps <= 0) return null;
  return (bps / 100).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatRelativeTr(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const deltaMs = now - then;
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) return 'Az önce';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours <= 12 ? 'Bugün' : 'Dün';
  const days = Math.round(hours / 24);
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 14) return '1 hafta önce';
  return `${Math.round(days / 7)} hafta önce`;
}
