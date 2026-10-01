const ALLOWED_EXACT = new Set([
  '/(tabs)/orders',
  '/(tabs)/account',
  '/account/club',
  '/account/spin',
  '/account/notifications',
  '/account/support',
  '/account/favorites',
  '/orders',
  '/deals',
  '/branches',
  '/legal',
]);

const ALLOWED_PREFIXES = ['/orders/', '/account/support', '/table/', '/products/', '/legal/'];

/**
 * Notification hrefs are untrusted. Only in-app destinations that M5 can
 * actually open are returned; everything else is ignored (no arbitrary execution).
 */
export function notificationDestination(href: string | null | undefined): string | null {
  if (!href || typeof href !== 'string') return null;
  const trimmed = href.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('://') || trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('@')) {
    return null;
  }
  const path = trimmed.split('?')[0] ?? trimmed;
  if (path.startsWith('/auth') || path.startsWith('/payment')) return null;
  if (ALLOWED_EXACT.has(path)) {
    if (path === '/orders') return '/(tabs)/orders';
    return trimmed;
  }
  if (ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) return trimmed;
  return null;
}
