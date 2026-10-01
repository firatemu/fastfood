import type { Cart } from './schemas';

let snapshot: Cart | null = null;
const listeners = new Set<() => void>();

export function getCartSnapshot(): Cart | null {
  return snapshot;
}

export function notifyCartChanged(cart?: Cart | null): void {
  if (cart !== undefined) snapshot = cart;
  for (const listener of listeners) listener();
}

export function subscribeCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function cartItemCount(cart: Cart | null | undefined): number {
  return cart?.lineItems.reduce((n, line) => n + line.quantity, 0) ?? 0;
}
