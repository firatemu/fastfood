/**
 * Courier session store.
 *
 * Tokens live in the platform keystore (Keychain on iOS, EncryptedSharedPreferences
 * on Android) via `expo-secure-store`. They are never written to AsyncStorage or
 * any unencrypted store, and never logged.
 *
 * `SecureStore` is asynchronous, so the store keeps an in-memory cache that the
 * API client reads synchronously on every request, plus an explicit `hydrate`
 * step. The root layout awaits hydration before it renders the navigator, which
 * is what prevents an authenticated screen from flashing before the session is
 * known.
 */
import * as SecureStore from 'expo-secure-store';

export interface CourierSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

/** SecureStore keys may only contain alphanumerics, `.`, `-` and `_`. */
const SESSION_KEY = 'fastfood_courier_session';

let session: CourierSession | null = null;
let hydrated = false;
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

/** True once the keystore has been read, whether or not it held a session. */
export function isSessionHydrated(): boolean {
  return hydrated;
}

function isCourierSession(value: unknown): value is CourierSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string'
  );
}

/**
 * Reads any persisted session into the in-memory cache. Safe to call more than
 * once; later calls overwrite the cache. A corrupt or truncated keystore entry
 * is discarded rather than crashing the app on launch.
 */
export async function hydrateSession(): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      session = isCourierSession(parsed) ? parsed : null;
      if (!session) await SecureStore.deleteItemAsync(SESSION_KEY);
    } else {
      session = null;
    }
  } catch {
    // A keystore read failure must not strand the app on the boot screen.
    session = null;
  } finally {
    hydrated = true;
    notify();
  }
}

export async function setCourierSession(next: CourierSession | null): Promise<void> {
  session = next;
  try {
    if (next) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next));
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  } catch {
    // The in-memory session is still usable for this app run; the failure only
    // means it will not survive a restart.
  }
  notify();
}

export async function clearCourierSession(): Promise<void> {
  session = null;
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Nothing to do: the cache is already cleared, which is what logout means.
  }
  hydrated = true;
  notify();
}