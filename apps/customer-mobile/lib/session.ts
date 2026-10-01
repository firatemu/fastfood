/**
 * Customer + guest session.
 *
 * Refresh/session credentials persist only through the injected secret Kv
 * (expo-secure-store in the app). Guest id uses durable non-secret storage.
 * Authenticated state is exposed only after the backend validates refresh.
 */

import { ApiError, ApiNetworkError, ApiTimeoutError } from '@fastfood/api-client';

import type { KvStore } from './kv';
import { memoryKv } from './kv';

export const SECRET_SESSION_KEY = 'ff.customer.session';
export const GUEST_SESSION_KEY = 'ff.guest.session.id';

export interface CustomerSession {
  customerId: string;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
}

export type AuthBootstrapState = 'pending' | 'ready' | 'offline';

type SecretPayload = {
  customerId: string;
  refreshToken: string;
  refreshExpiresAt: string;
};

export type SessionRefreshFn = (refreshToken: string) => Promise<CustomerSession>;

let secretKv: KvStore = memoryKv();
let guestKv: KvStore = memoryKv();
let guestSessionId: string | null = null;
let customerSession: CustomerSession | null = null;
let bootstrapState: AuthBootstrapState = 'pending';
let refreshFn: SessionRefreshFn = defaultRefresh;
const sessionListeners = new Set<() => void>();
const bootstrapListeners = new Set<() => void>();

function notifySession(): void {
  for (const listener of sessionListeners) listener();
}

function notifyBootstrap(): void {
  for (const listener of bootstrapListeners) listener();
}

function mintGuestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseSecret(raw: string): SecretPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record['customerId'] !== 'string' || record['customerId'].length < 1) return null;
    if (typeof record['refreshToken'] !== 'string' || record['refreshToken'].length < 8) return null;
    if (typeof record['refreshExpiresAt'] !== 'string') return null;
    return {
      customerId: record['customerId'],
      refreshToken: record['refreshToken'],
      refreshExpiresAt: record['refreshExpiresAt'],
    };
  } catch {
    return null;
  }
}

async function persistSecret(session: CustomerSession | null): Promise<void> {
  if (!session) {
    await secretKv.removeItem(SECRET_SESSION_KEY);
    return;
  }
  const payload: SecretPayload = {
    customerId: session.customerId,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt,
  };
  await secretKv.setItem(SECRET_SESSION_KEY, JSON.stringify(payload));
}

async function persistGuest(id: string): Promise<void> {
  await guestKv.setItem(GUEST_SESSION_KEY, id);
}

async function defaultRefresh(_refreshToken: string): Promise<CustomerSession> {
  throw new Error('session refresh is not configured');
}

function isExpiredAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    const code = error.envelope.error.code;
    return (
      code === 'AUTH_SESSION_EXPIRED' ||
      code === 'AUTH_UNAUTHENTICATED' ||
      code === 'AUTH_INVALID_CREDENTIALS' ||
      error.status === 401
    );
  }
  return false;
}

function isNetworkFailure(error: unknown): boolean {
  return error instanceof ApiNetworkError || error instanceof ApiTimeoutError;
}

export function configureSessionStores(input: { secret: KvStore; guest: KvStore }): void {
  secretKv = input.secret;
  guestKv = input.guest;
}

export function setSessionRefresh(fn: SessionRefreshFn | null): void {
  refreshFn = fn ?? defaultRefresh;
}

export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function subscribeBootstrap(listener: () => void): () => void {
  bootstrapListeners.add(listener);
  return () => {
    bootstrapListeners.delete(listener);
  };
}

export function getAuthBootstrapState(): AuthBootstrapState {
  return bootstrapState;
}

function setBootstrap(next: AuthBootstrapState): void {
  if (bootstrapState === next) return;
  bootstrapState = next;
  notifyBootstrap();
}

export function getGuestSessionId(): string {
  if (!guestSessionId) {
    guestSessionId = mintGuestId();
  }
  return guestSessionId;
}

/** New guest identity after logout so the merged cart unique key is not reused. */
export async function rotateGuestSessionId(): Promise<string> {
  guestSessionId = mintGuestId();
  await persistGuest(guestSessionId);
  return guestSessionId;
}

export function getCustomerSession(): CustomerSession | null {
  return customerSession;
}

export function setCustomerSession(session: CustomerSession | null): void {
  customerSession = session;
  notifySession();
}

export async function persistCustomerSession(session: CustomerSession | null): Promise<void> {
  setCustomerSession(session);
  await persistSecret(session);
}

export function clearCustomerSession(): void {
  customerSession = null;
  notifySession();
}

export async function restoreSession(): Promise<AuthBootstrapState> {
  setBootstrap('pending');
  try {
    const storedGuest = await guestKv.getItem(GUEST_SESSION_KEY);
    if (storedGuest && storedGuest.length > 8) {
      guestSessionId = storedGuest;
    } else {
      guestSessionId = mintGuestId();
      await persistGuest(guestSessionId);
    }

    const raw = await secretKv.getItem(SECRET_SESSION_KEY);
    if (!raw) {
      setCustomerSession(null);
      setBootstrap('ready');
      return 'ready';
    }

    const parsed = parseSecret(raw);
    if (!parsed) {
      await secretKv.removeItem(SECRET_SESSION_KEY);
      setCustomerSession(null);
      setBootstrap('ready');
      return 'ready';
    }

    try {
      const next = await refreshFn(parsed.refreshToken);
      await persistCustomerSession(next);
      setBootstrap('ready');
      return 'ready';
    } catch (error) {
      if (isNetworkFailure(error)) {
        setCustomerSession(null);
        setBootstrap('offline');
        return 'offline';
      }
      if (isExpiredAuthError(error)) {
        await secretKv.removeItem(SECRET_SESSION_KEY);
        setCustomerSession(null);
        setBootstrap('ready');
        return 'ready';
      }
      await secretKv.removeItem(SECRET_SESSION_KEY);
      setCustomerSession(null);
      setBootstrap('ready');
      return 'ready';
    }
  } catch {
    setCustomerSession(null);
    setBootstrap('offline');
    return 'offline';
  }
}

export async function resetSessionForTests(): Promise<void> {
  secretKv = memoryKv();
  guestKv = memoryKv();
  guestSessionId = null;
  customerSession = null;
  bootstrapState = 'pending';
  refreshFn = defaultRefresh;
  notifySession();
  notifyBootstrap();
}
