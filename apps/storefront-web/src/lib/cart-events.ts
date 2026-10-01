let cartVersion = 0;
const listeners = new Set<() => void>();

export function notifyCartChanged(): void {
  if (typeof window === 'undefined') return;
  cartVersion += 1;
  for (const listener of listeners) listener();
  window.dispatchEvent(new CustomEvent('ff-cart-changed'));
}

export function getCartVersion(): number {
  return cartVersion;
}

export function subscribeCartChanged(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = () => onChange();
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(onChange);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}
