/**
 * Browser-session helpers shared by the staff and customer auth controllers.
 *
 * Document 32 §5 locks the browser credential layout: "Secure + HttpOnly +
 * SameSite=Lax cookie scoped to the refresh/session endpoint family" and
 * "refresh endpoints enforce strict allowed-origin checks".
 */
import { ErrorCodes } from '@fastfood/contracts';
import { ForbiddenException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** Cookie helpers ------------------------------------------------------- */

export function readCookie(request: FastifyRequest, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function sessionCookie(name: string, value: string, path: string, maxAge: number): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCookie(name: string, path: string): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${name}=; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** Origin / client-platform detection ----------------------------------- */

/**
 * A browser session is a request that carries an `Origin` header listed in
 * `API_CORS_ORIGINS`. Anything else is a native/unnamed client.
 */
export function isAllowedBrowserRequest(request: FastifyRequest): boolean {
  const rawOrigin = request.headers.origin;
  if (!rawOrigin) return false;
  let origin: string;
  try {
    origin = new URL(rawOrigin).origin;
  } catch {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Browser session origin is invalid.',
    });
  }
  const allowed = (process.env['API_CORS_ORIGINS'] ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!allowed.some((entry) => entry !== '*' && entry === origin)) {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Browser session origin is not allowed.',
    });
  }
  return true;
}

/**
 * Native clients (Expo) cannot use an HttpOnly cookie jar for the session
 * family, so they declare themselves explicitly and keep the refresh
 * credential in the platform secure store (document 32 §5).
 */
export function isNativeClientRequest(request: FastifyRequest): boolean {
  const raw = request.headers['x-client-platform'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return false;
  const platform = value.trim().toLowerCase();
  return platform === 'mobile' || platform === 'native' || platform === 'expo';
}

/**
 * `true` when the request must use the browser cookie transport, `false`
 * when the refresh credential travels in the request body.
 *
 * Only an explicitly declared native client may use the body transport. Any
 * other client is treated as a browser: the refresh credential goes into the
 * HttpOnly cookie and never reaches JavaScript. A declared origin that is not
 * in `API_CORS_ORIGINS` is rejected outright.
 */
export function usesBrowserSessionCookie(request: FastifyRequest): boolean {
  if (isNativeClientRequest(request)) return false;
  isAllowedBrowserRequest(request);
  return true;
}

export function setSessionCookie(
  reply: FastifyReply,
  name: string,
  value: string,
  path: string,
  maxAge: number,
): void {
  reply.header('Set-Cookie', sessionCookie(name, value, path, maxAge));
}
