/**
 * Canonical resource policy interface (document 39 §3).
 * Feature modules implement this for branch scope, ownership, courier
 * assignment, etc. Real policies are added in Phase 3.
 */
export interface ResourcePolicy<TResource, TPrincipal> {
  canAccess(principal: TPrincipal, resource: TResource): Promise<boolean>;
  scopeFilter(principal: TPrincipal): unknown;
}
