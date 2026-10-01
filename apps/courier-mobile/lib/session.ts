/**
 * In-memory staff/courier session for the mobile shell.
 */

export interface CourierSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

let session: CourierSession | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCourierSession(): CourierSession | null {
  return session;
}

export function setCourierSession(next: CourierSession | null): void {
  session = next;
  notify();
}

export function clearCourierSession(): void {
  session = null;
  notify();
}
