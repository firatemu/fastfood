/**
 * Invalidation channel for the account-icon unread badge.
 *
 * The badge lives in the long-lived header, so read state mutated on the
 * notifications screen has to be broadcast or the badge keeps the count it
 * fetched on first paint.
 */
const listeners = new Set<() => void>();

export function notifyNotificationsChanged(): void {
  for (const listener of listeners) listener();
}

export function subscribeNotificationsChanged(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
