/**
 * Invalidation channel for the header unread badge.
 *
 * Read state is mutated on the notifications screen, so the header count has to
 * be told instead of waiting for the next mount.
 */
const listeners = new Set<() => void>();

export function notifyNotificationsChanged(): void {
  for (const listener of listeners) listener();
}

export function subscribeNotificationsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
