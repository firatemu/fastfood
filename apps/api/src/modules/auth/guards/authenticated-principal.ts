import type { ActorType } from '@fastfood/domain-types';

/**
 * Canonical authenticated principal shape (document 39 §3).
 *
 * Set by the auth pipeline (P3-005 / P3-006) and consumed by
 * downstream guards and controllers. The shape intentionally
 * carries the actor type + status + (optional) branch scope +
 * permission snapshot; downstream guards decide which fields are
 * required.
 */
export interface AuthenticatedPrincipal {
  /** User UUID. */
  id: string;
  /** Discriminated actor type — STAFF / CUSTOMER / COURIER / etc. */
  actorType: ActorType;
  /** Account status; rejected unless `ACTIVE` by AccountStatusGuard. */
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'PENDING_VERIFICATION';
  /** Set of permission codes that the principal currently holds. */
  permissions: ReadonlySet<string>;
  /** Super Admin bypasses per-page grants and has global branch scope. */
  isSuperAdmin?: boolean;
  /** Optional branch-id scope used by `ResourceScopeGuard`. */
  branchIds?: ReadonlySet<string>;
  /** Set on customer principals by P3-005 to enforce IDOR tests. */
  customerId?: string;
  /** Set on courier principals to enforce delivery-job scope. */
  courierId?: string;
  /** Session id that established the principal (audit trail). */
  sessionId?: string;
}
