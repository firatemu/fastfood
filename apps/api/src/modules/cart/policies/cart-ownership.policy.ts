import { ErrorCodes } from '@fastfood/contracts';
import { ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../auth/guards/authenticated-principal.js';
import type { ResourcePolicy } from '../../auth/policies/resource-policy.js';

/**
 * CartOwnershipPolicy (document 39 §5 + document 09 §1).
 *
 * A cart is owned by either:
 *   - the authenticated principal (customer cart, when userId is set), OR
 *   - the guest session id (guest cart, no principal — not a "resource
 *     ownership" concern because the request carries the session id
 *     directly and is gated at the controller layer).
 *
 * For customer carts the principal must own the cart. Couriers /
 * staff with branch scope do not have access to arbitrary customer
 * carts (they can read the cart of an order they are assigned to,
 * but Phase 5's cart surface is customer-only).
 */
@Injectable()
export class CartOwnershipPolicy
  implements
    ResourcePolicy<{ userId: string | null; guestSessionId: string | null }, AuthenticatedPrincipal>
{
  async canAccess(
    principal: AuthenticatedPrincipal,
    resource: { userId: string | null; guestSessionId: string | null },
  ): Promise<boolean> {
    // Customer carts: principal.id === cart.userId.
    if (resource.userId) {
      return principal.id === resource.userId;
    }
    // Guest carts are not owned by any authenticated principal; the
    // guest session id is opaque and asserted at the controller.
    return false;
  }

  scopeFilter(_principal: AuthenticatedPrincipal): { userId: string } {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Cart ownership policy does not support scope filtering.',
    });
  }

  /**
   * Convenience wrapper — throws AUTH_SCOPE_DENIED if the principal
   * is not the owner of the cart.
   */
  enforce(
    principal: AuthenticatedPrincipal,
    resource: { userId: string | null; guestSessionId: string | null },
  ): void {
    if (!resource.userId) {
      // Guest cart — caller must already have validated the guest
      // session id at the controller layer.
      return;
    }
    if (principal.id !== resource.userId) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'You do not have access to this cart.',
      });
    }
  }
}
