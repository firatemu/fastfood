import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { fetchCart } from '../lib/cart';
import { cartItemCount, getCartSnapshot, subscribeCart } from '../lib/cart-events';

export function useCartCount(): number {
  const [count, setCount] = useState(() => cartItemCount(getCartSnapshot()));

  // fetchCart() publishes its response through notifyCartChanged, which is what
  // drives setCount. A failed read keeps the last known count.
  const sync = useCallback(async () => {
    try {
      await fetchCart();
    } catch {
      // Cart unreachable (offline / unauthenticated); keep the last known count.
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeCart(() => setCount(cartItemCount(getCartSnapshot())));
    void sync();
    return unsub;
  }, [sync]);

  // The header outlives individual screens, so the cart can change while this
  // screen is off-focus — order placement consumes it server-side, and the cart
  // screen can clear it — without a local cart event reaching us.
  useFocusEffect(
    useCallback(() => {
      void sync();
    }, [sync]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void sync();
    });
    return () => sub.remove();
  }, [sync]);

  return count;
}
