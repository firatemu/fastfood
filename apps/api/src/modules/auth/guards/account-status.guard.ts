import { ErrorCodes } from '@fastfood/contracts';
import { ActorType } from '@fastfood/domain-types';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { AuthenticatedPrincipal } from './authenticated-principal.js';

/**
 * Canonical `AccountStatusGuard` — document 39 §3 "AccountStatusGuard".
 *
 * Responsibilities:
 *   - ensure staff / customer identity is `ACTIVE`,
 *   - ensure session has not been revoked (Phase 3: out of scope —
 *     wired into the auth service by P3-005),
 *   - enforce relevant staff-account restrictions.
 *
 * Phase 3 ships the guard + principal shape; the actual user lookup
 * is performed by `AccountStatusService.lookupPrincipal()` which is
 * implemented by P3-005. The guard remains fail-closed: when the
 * principal is missing required fields it rejects.
 */
@Injectable()
export class AccountStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        principal?: AuthenticatedPrincipal;
      }
    >();
    const principal = request.principal;
    if (!principal) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'Account status cannot be resolved without a principal.',
      });
    }
    if (principal.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Account is not active.',
      });
    }
    if (!principal.id || !principal.actorType) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'Principal is incomplete.',
      });
    }
    if (
      principal.actorType !== ActorType.STAFF &&
      principal.actorType !== ActorType.CUSTOMER &&
      principal.actorType !== ActorType.COURIER
    ) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Actor type is not permitted for this endpoint.',
      });
    }
    return true;
  }
}
