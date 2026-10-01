import { ErrorCodes } from '@fastfood/contracts';
import { ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import type { ResourcePolicy } from '../auth/policies/resource-policy.js';

/**
 * Customer ownership policy (document 39 §5).
 *
 * Every customer-owned resource (Address, Order, LoyaltyLedgerEntry)
 * must validate that `resource.userId === principal.id`. IDOR is
 * rejected with `AUTH_SCOPE_DENIED` (HTTP 403). The controller calls
 * `canAccess()` before any mutation / read.
 *
 * The policy is implemented per the canonical
 * `ResourcePolicy<TResource, TPrincipal>` interface from
 * `apps/api/src/modules/auth/policies/resource-policy.ts`.
 */
@Injectable()
export class CustomerOwnershipPolicy
  implements ResourcePolicy<{ userId: string }, AuthenticatedPrincipal>
{
  async canAccess(
    principal: AuthenticatedPrincipal,
    resource: { userId: string },
  ): Promise<boolean> {
    return principal.id === resource.userId;
  }

  scopeFilter(_principal: AuthenticatedPrincipal): { userId: string } {
    // Should never be reached for the customer endpoints because
    // the endpoint always targets the authenticated customer's id.
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Customer ownership policy does not support scope filtering.',
    });
  }

  /**
   * Convenience wrapper — throws AUTH_SCOPE_DENIED if the principal
   * is not the owner of the resource. The controller calls this
   * before any mutation / read.
   */
  enforce(principal: AuthenticatedPrincipal, resource: { userId: string }): void {
    if (principal.id !== resource.userId) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'You do not have access to this resource.',
      });
    }
  }
}
