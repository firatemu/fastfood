const TABLE_CODE = /^[A-Za-z0-9-]{3,32}$/;

export function isValidTableCode(value: string | null | undefined): value is string {
  return Boolean(value && TABLE_CODE.test(value));
}

/** Untrusted deep-link / typed input → public table code or null. */
export function parseTableCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('@')) return null;
  if (isValidTableCode(trimmed) && !trimmed.includes('://') && !trimmed.includes('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://local.invalid${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const tableIdx = parts.findIndex((part) => part === 'table');
    const candidate =
      parsed.hostname === 'table' || parsed.host === 'table'
        ? parts[0]
        : tableIdx >= 0
          ? parts[tableIdx + 1]
          : null;
    const fromQuery = parsed.searchParams.get('code') ?? parsed.searchParams.get('table');
    if (isValidTableCode(fromQuery)) return fromQuery;
    return isValidTableCode(candidate) ? candidate : null;
  } catch {
    return isValidTableCode(trimmed) ? trimmed : null;
  }
}
