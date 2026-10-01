import { useEffect, useState } from 'react';

import { fetchCart } from '../lib/cart';
import { cartItemCount, getCartSnapshot, subscribeCart } from '../lib/cart-events';

export function useCartCount(): number {
  const [count, setCount] = useState(() => cartItemCount(getCartSnapshot()));

  useEffect(() => {
    const unsub = subscribeCart(() => setCount(cartItemCount(getCartSnapshot())));
    void fetchCart().catch(() => undefined);
    return unsub;
  }, []);

  return count;
}
