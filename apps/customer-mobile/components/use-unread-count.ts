import { useEffect, useState } from 'react';

import { fetchNotifications } from '../lib/engagement';
import { useCustomerSession } from '../lib/use-session';

export function useUnreadCount(): number {
  const session = useCustomerSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    void fetchNotifications()
      .then((next) => {
        if (alive) setCount(next.unreadCount);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [session]);

  return session ? count : 0;
}
