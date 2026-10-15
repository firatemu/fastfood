export function isA1Path(pathname: string): boolean {
  if (pathname === '/' || pathname === '/kitchen') return true;
  if (pathname === '/orders' || pathname.startsWith('/orders/')) return true;
  return false;
}

/** Catalog master-data routes rebuilt in A2. `/catalog` redirects to products. */
export function isA2Path(pathname: string): boolean {
  return pathname === '/catalog' || pathname.startsWith('/catalog/');
}

const A3_STATIC_BRANCH_SEGMENTS = ['service-areas', 'availability', 'map'] as const;

/** `/branches/:id` excluding static A3 siblings. */
export function isRouteIdentifiedBranchPath(pathname: string): boolean {
  const match = pathname.match(/^\/branches\/([^/]+)$/);
  if (!match?.[1]) return false;
  return !(A3_STATIC_BRANCH_SEGMENTS as readonly string[]).includes(match[1]);
}

export function routeBranchId(pathname: string): string | null {
  const match = pathname.match(/^\/branches\/([^/]+)$/);
  if (!match?.[1]) return null;
  if ((A3_STATIC_BRANCH_SEGMENTS as readonly string[]).includes(match[1])) return null;
  return match[1];
}

/** Branch / service-area / availability / courier routes rebuilt in A3. */
export function isA3Path(pathname: string): boolean {
  if (pathname === '/couriers') return true;
  if (pathname === '/branches' || pathname.startsWith('/branches/')) return true;
  return false;
}

/** Customers, loyalty, promotions, payments, refunds rebuilt in A4. */
export function isA4Path(pathname: string): boolean {
  if (pathname === '/loyalty' || pathname === '/refunds') return true;
  if (pathname === '/customers' || pathname.startsWith('/customers/')) return true;
  if (pathname === '/promotions' || pathname.startsWith('/promotions/')) return true;
  if (pathname === '/payments' || pathname.startsWith('/payments/')) return true;
  return false;
}

/** Reports, users, roles, audit, settings rebuilt in A5. */
export function isA5Path(pathname: string): boolean {
  return (
    pathname === '/reports' ||
    pathname === '/users' ||
    pathname === '/roles' ||
    pathname === '/audit' ||
    pathname === '/settings'
  );
}

export function isOpsShellPath(pathname: string): boolean {
  return (
    isA1Path(pathname) ||
    isA2Path(pathname) ||
    isA3Path(pathname) ||
    isA4Path(pathname) ||
    isA5Path(pathname)
  );
}

/** Login and access-denied are not OpsShell production routes. */
export function isIntendedA0ScaffoldPath(pathname: string): boolean {
  return pathname === '/login' || pathname === '/access-denied' || pathname.startsWith('/login/');
}
