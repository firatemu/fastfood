import { ErrorCodes } from '@fastfood/contracts';
import { ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../auth/guards/authenticated-principal.js';
import type { ResourcePolicy } from '../../auth/policies/resource-policy.js';

/**
 * BranchScopePolicy (document 39 §4).
 *
 * Enforces that STAFF principals cannot read / mutate resources
 * outside their assigned branch set. Customer principals are
 * unaffected (they have no branch scope); courier principals are
 * scoped to their own identity — separate policy class.
 */
@Injectable()
export class BranchScopePolicy
  implements ResourcePolicy<{ branchId: string }, AuthenticatedPrincipal>
{
  async canAccess(
    principal: AuthenticatedPrincipal,
    resource: { branchId: string },
  ): Promise<boolean> {
    if (principal.actorType !== 'STAFF') {
      return true;
    }
    if (principal.isSuperAdmin) return true;
    return Boolean(principal.branchIds?.has(resource.branchId));
  }

  scopeFilter(principal: AuthenticatedPrincipal): { branchId: { in: readonly string[] } } {
    if (principal.actorType === 'STAFF' && principal.isSuperAdmin) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'Super Admin must use an explicit global query instead of a branch filter.',
      });
    }
    if (!principal.branchIds || principal.branchIds.size === 0) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'No branch scope available.',
      });
    }
    return { branchId: { in: [...principal.branchIds] } };
  }

  enforce(principal: AuthenticatedPrincipal, resource: { branchId: string }): void {
    if (principal.actorType !== 'STAFF') {
      return;
    }
    if (principal.isSuperAdmin) return;
    if (!principal.branchIds?.has(resource.branchId)) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'You do not have access to this branch.',
      });
    }
  }
}
