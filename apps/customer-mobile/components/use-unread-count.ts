import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchNotifications } from '../lib/engagement';
import { subscribeNotificationsChanged } from '../lib/notification-events';
import { useCustomerSession } from '../lib/use-session';

export function useUnreadCount(): number {
  const session = useCustomerSession();
  const [count, setCount] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // No setState on the unauthenticated path: the hook already returns
  // 0 without a session, and a synchronous set in an effect body is a
  // cascading render.
  const sync = useCallback(() => {
    if (!session) return;
    void fetchNotifications()
      .then((next) => {
        if (mounted.current) setCount(next.unreadCount);
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    sync();
  }, [sync]);

  // The inbox marks notifications read on another screen.
  useEffect(() => subscribeNotificationsChanged(sync), [sync]);

  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);

  return session ? count : 0;
}
