import { ErrorCodes } from '@fastfood/contracts';
import { ActorType } from '@fastfood/domain-types';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { CustomerAuthService } from '../customer/customer-auth.service.js';
import { readBearerToken } from '../customer/request-identity.js';
import { StaffAuthService } from '../staff/staff-auth.service.js';

import type { AuthenticatedPrincipal } from './authenticated-principal.js';

/**
 * Canonical `AuthGuard` — document 39 §3 "AuthGuard".
 *
 * Staff identity is accepted only from an RS256 access token whose session,
 * user status, role permissions, and branch scopes are resolved from storage.
 * Customer identity is resolved only from an opaque refresh/session token via
 * CustomerAuthService.resolveSession.
 * Browser-supplied X-User-Id and spoofable customer uuid bearers are not trusted.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  // StaffAuthService and CustomerAuthService are resolved on demand via
  // ModuleRef instead of constructor injection because the canonical Nest
  // DI path occasionally loses one of the two `@Optional() @Inject(...)`
  // dependencies depending on the controller module that triggers the
  // guard — staff identity was silently dropped on /admin/* routes even
  // though /auth/staff/me worked with the same token. Caching the resolved
  // services keeps the hot path cost-free.
  #staffSessions: StaffAuthService | null = null;
  #customerSessions: CustomerAuthService | null = null;
  #servicesResolved = false;

  constructor(@Inject(ModuleRef) private readonly moduleRef: ModuleRef) {}

  async #resolveServices(): Promise<void> {
    if (this.#servicesResolved) return;
    this.#servicesResolved = true;
    try {
      const staff = this.moduleRef.get(StaffAuthService, { strict: false });
      if (staff) this.#staffSessions = staff;
    } catch {
      // Service not registered in this scope — fall back to null
    }
    try {
      const customer = this.moduleRef.get(CustomerAuthService, { strict: false });
      if (customer) this.#customerSessions = customer;
    } catch {
      // Service not registered in this scope — fall back to null
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.#resolveServices();

    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        authenticatedUserId?: string;
        principal?: AuthenticatedPrincipal;
      }
    >();

    await this.#bootstrapFromHeaders(request);

    if (!request.authenticatedUserId) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'Authentication is required.',
      });
    }
    return true;
  }

  async #bootstrapFromHeaders(
    request: FastifyRequest & {
      authenticatedUserId?: string;
      principal?: AuthenticatedPrincipal;
    },
  ): Promise<void> {
    if (request.authenticatedUserId) {
      request.principal ??= {
        id: request.authenticatedUserId,
        actorType: ActorType.CUSTOMER,
        status: 'ACTIVE',
        permissions: new Set<string>(),
        customerId: request.authenticatedUserId,
      };
      return;
    }

    const bearer = readBearerToken(request);

    if (bearer) {
      const staffPrincipal = await this.#staffSessions?.resolveAccessToken(bearer);
      if (staffPrincipal) {
        request.authenticatedUserId = staffPrincipal.id;
        request.principal = staffPrincipal;
        return;
      }

      if (this.#customerSessions) {
        const session = await this.#customerSessions.resolveSession(bearer);
        if (session) {
          request.authenticatedUserId = session.customerId;
          request.principal = {
            id: session.customerId,
            actorType: ActorType.CUSTOMER,
            status: 'ACTIVE',
            permissions: new Set<string>(),
            customerId: session.customerId,
            sessionId: session.sessionId,
          };
        }
      }
    }
  }
}
