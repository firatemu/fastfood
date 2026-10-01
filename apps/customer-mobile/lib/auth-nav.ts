const DEFAULT_RETURN = '/(tabs)/account';

const ALLOWED_EXACT = new Set([
  '/',
  '/(tabs)',
  '/(tabs)/account',
  '/(tabs)/orders',
  '/(tabs)/index',
  '/cart',
  '/checkout',
  '/account/addresses',
  '/account/settings',
  '/account/security',
  '/account/favorites',
  '/account/club',
  '/account/spin',
  '/account/notifications',
  '/account/support',
  '/table',
  '/table/scan',
  '/branches',
  '/deals',
  '/legal',
  '/legal/allergens',
]);

const ALLOWED_PREFIXES = [
  '/products/',
  '/orders/',
  '/account/',
  '/(tabs)/',
  '/table/',
  '/legal/',
];

const BLOCKED_PREFIXES = ['/auth', '/payment/return', '/payment/'];

const PROTECTED_EXACT = new Set([
  '/account/addresses',
  '/account/settings',
  '/account/security',
  '/account/favorites',
  '/account/club',
  '/account/spin',
  '/account/notifications',
  '/account/support',
  '/(tabs)/orders',
  '/cart',
]);

export function isProtectedPath(path: string): boolean {
  const clean = path.split('?')[0] ?? path;
  return PROTECTED_EXACT.has(clean);
}

export type ProtectedDecision = 'wait' | 'allow_public' | 'allow_auth' | 'send_to_auth';

export function resolveProtectedNavigation(input: {
  path: string;
  bootstrap: 'pending' | 'ready' | 'offline';
  authenticated: boolean;
}): ProtectedDecision {
  if (input.bootstrap === 'pending') return 'wait';
  if (!isProtectedPath(input.path)) return 'allow_public';
  if (input.authenticated) return 'allow_auth';
  return 'send_to_auth';
}

export function safeReturnDestination(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_RETURN;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return DEFAULT_RETURN;
  if (trimmed.includes('://') || trimmed.includes('..')) return DEFAULT_RETURN;
  const path = trimmed.split('?')[0] ?? trimmed;
  if (path.includes('\\') || path.includes('@')) return DEFAULT_RETURN;
  if (BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}`))) {
    if (path.startsWith('/auth')) return DEFAULT_RETURN;
    if (path.startsWith('/payment/')) return DEFAULT_RETURN;
  }
  if (ALLOWED_EXACT.has(path)) return path;
  if (ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) return path;
  return DEFAULT_RETURN;
}

export function authRouteParams(next: string): { next: string } {
  return { next: safeReturnDestination(next) };
}
