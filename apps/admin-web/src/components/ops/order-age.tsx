'use client';

import { useSyncExternalStore } from 'react';

import { ageTone, orderAge } from '../../lib/order-summary';

const subscribers = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  if (typeof window !== 'undefined' && interval == null) {
    interval = setInterval(() => {
      for (const cb of subscribers) cb();
    }, 30_000);
  }
  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0 && interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}

let clientNow = 0;
function nowTick(): number {
  clientNow = Date.now();
  return clientNow;
}

function getServerSnapshot(): number {
  return 0;
}

export function OrderAge(props: { createdAt: string | undefined; className?: string }) {
  const now = useSyncExternalStore(subscribe, nowTick, getServerSnapshot);
  if (now === 0 || !props.createdAt) {
    return (
      <span className={`ops-age ops-age--idle ${props.className ?? ''}`.trim()}>
        <span aria-hidden className="ops-age__pulse" />
        —
      </span>
    );
  }
  const created = new Date(props.createdAt).getTime();
  const minuteCount = Math.max(0, Math.floor((now - created) / 60_000));
  const tone = ageTone(minuteCount);
  return (
    <span className={`ops-age ops-age--${tone} ${props.className ?? ''}`.trim()}>
      <span aria-hidden className="ops-age__pulse" />
      {orderAge(props.createdAt, new Date(now))}
    </span>
  );
}


