'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InboxNotification,
} from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { ShopError, ShopSkeleton } from './shop-states';

export function NotificationsPage() {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchNotifications();
      setItems(data.items);
      setUnread(data.unreadCount);
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, []);

  async function readOne(id: string) {
    const next = await markNotificationRead(id);
    setItems((rows) => rows.map((row) => (row.id === id ? next : row)));
    setUnread((count) => Math.max(0, count - (next.read ? 1 : 0)));
  }

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error') {
    return (
      <RequireCustomer>
        <ShopError title="Bildirimler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
      </RequireCustomer>
    );
  }

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="notifications">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h1 className="font-headline-md uppercase">Bildirimler</h1>
              {unread > 0 ? (
                <button
                  type="button"
                  className="font-label-sm uppercase text-secondary-container"
                  onClick={() =>
                    void markAllNotificationsRead().then(() => {
                      setItems((rows) => rows.map((row) => ({ ...row, read: true })));
                      setUnread(0);
                    })
                  }
                  data-ff-notifications-read-all
                >
                  Tümünü oku
                </button>
              ) : null}
            </div>
            {items.length === 0 ? (
              <p className="font-body-md text-on-surface-variant">Bildirim yok.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full text-left rounded-xl p-space-md ${item.read ? 'bg-surface-container' : 'bg-surface-container-high'}`}
                      onClick={() => void readOne(item.id)}
                      data-ff-notification={item.read ? 'read' : 'unread'}
                    >
                      <p className="font-label-md">{item.title}</p>
                      <p className="font-body-sm text-on-surface-variant break-words">{item.body}</p>
                      {item.href ? (
                        <Link href={item.href} className="font-label-sm uppercase text-primary mt-1 inline-block">
                          Aç
                        </Link>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
