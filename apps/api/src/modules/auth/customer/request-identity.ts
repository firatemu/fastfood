import { ActorType } from '@fastfood/domain-types';
import type { FastifyRequest } from 'fastify';

import type { AuthenticatedPrincipal } from '../guards/authenticated-principal.js';

import type { CustomerAuthService } from './customer-auth.service.js';

export type StorefrontPrincipal = {
  userId?: string;
  guestSessionId?: string;
};

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function readBearerToken(req: FastifyRequest): string | undefined {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const auth = headerValue(headers, 'authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

export function readGuestSessionId(req: FastifyRequest): string | undefined {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  return headerValue(headers, 'x-session-id');
}

function customerPrincipal(userId: string, sessionId?: string): AuthenticatedPrincipal {
  return {
    id: userId,
    actorType: ActorType.CUSTOMER,
    status: 'ACTIVE',
    permissions: new Set<string>(),
    customerId: userId,
    sessionId,
  };
}

export async function resolveCustomerUserId(
  req: FastifyRequest & { authenticatedUserId?: string; principal?: AuthenticatedPrincipal },
  sessions: CustomerAuthService | null | undefined,
): Promise<string | undefined> {
  if (req.authenticatedUserId) {
    if (!req.principal) {
      req.principal = customerPrincipal(req.authenticatedUserId);
    }
    return req.authenticatedUserId;
  }
  if (!sessions) return undefined;
  const bearer = readBearerToken(req);
  if (!bearer) return undefined;
  const session = await sessions.resolveSession(bearer);
  if (!session) return undefined;
  req.authenticatedUserId = session.customerId;
  req.principal = customerPrincipal(session.customerId, session.sessionId);
  return session.customerId;
}

export async function resolveStorefrontPrincipal(
  req: FastifyRequest & { authenticatedUserId?: string; principal?: AuthenticatedPrincipal },
  sessions: CustomerAuthService | null | undefined,
): Promise<StorefrontPrincipal> {
  const userId = await resolveCustomerUserId(req, sessions);
  return {
    userId,
    guestSessionId: readGuestSessionId(req),
  };
}
