'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { notifyNotificationsChanged } from '../../lib/notification-events';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InboxNotification,
} from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

/**
 * Inbox.
 *
 * Read state is carried by a leading rail, a dot and title weight — not by a
 * background wash, which turns a long inbox into a stripe pattern and stops
 * saying which single item still needs attention. Unread wears the info hue,
 * not the accent: "you have mail" must never look like "press here".
 *
 * The row is a plain container and the two actions are siblings. The previous
 * markup nested a `Link` inside the "mark read" `button`, which is invalid
 * HTML and leaves nested activation ambiguous.
 */
export function NotificationsPage() {
  const { toast } = useAccountUi();

  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setItems(data.items);
      setUnread(data.unreadCount);
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }, []);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, [load]);

  const readOne = useCallback(
    async (id: string) => {
      try {
        const next = await markNotificationRead(id);
        setItems((rows) => rows.map((row) => (row.id === id ? next : row)));
        setUnread((count) => Math.max(0, count - (next.read ? 1 : 0)));
        notifyNotificationsChanged();
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        toast.error('Bildirim güncellenemedi.', message);
      }
    },
    [toast],
  );

  const readAll = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setItems((rows) => rows.map((row) => ({ ...row, read: true })));
      setUnread(0);
      notifyNotificationsChanged();
      toast.ok('Tüm bildirimler okundu işaretlendi.');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error('Bildirimler güncellenemedi.', message);
    }
  }, [toast]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return (
      <ShopError title="Bildirimler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
    );
  }

  return (
    <AccountShell
      surface="notifications"
      eyebrow="Yardım"
      title="Bildirimler"
      description={
        unread > 0
          ? `${unread} bildirim okunmayı bekliyor.`
          : 'Hesabına ilişkin uygulama içi bildirimler.'
      }
      actions={
        unread > 0 ? (
          <button
            type="button"
            className="ff-btn ff-btn-outline"
            onClick={() => void readAll()}
            data-ff-notifications-read-all
          >
            <MaterialIcon name="mark_email_read" />
            Tümünü okundu işaretle
          </button>
        ) : null
      }
    >
      {error ? (
        <div className="ff-notice" data-tone="danger" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Gelen kutusu</h2>
          <p className="ff-section-desc">
            {items.length === 0 ? 'Gelen kutun boş.' : `${items.length} bildirim listeleniyor.`}
          </p>
        </div>
        <div className="ff-section-body">
          {items.length === 0 ? (
            <div className="ff-empty">
              <MaterialIcon name="notifications_none" />
              <p className="ff-empty-title">Bildirim yok</p>
              <p className="ff-empty-text">Sipariş ve kampanya bildirimleri burada görünür.</p>
            </div>
          ) : (
            <div className="ff-rows" data-ff-notification-list>
              {items.map((item) => (
                <div
                  className="ff-inbox-row"
                  key={item.id}
                  data-ff-notification={item.read ? 'read' : 'unread'}
                  data-unread={item.read ? 'false' : 'true'}
                >
                  {/* Decorative: the row's own action labels already announce
                      the read state to assistive technology. */}
                  <span aria-hidden className="ff-inbox-dot" />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="ff-inbox-title">{item.title}</p>
                    <p className="ff-inbox-body">{item.body}</p>
                    <p className="ff-inbox-when">{formatWhen(item.createdAt)}</p>
                  </div>

                  <div className="ff-row-actions" style={{ alignItems: 'center' }}>
                    {!item.read ? (
                      <button
                        type="button"
                        className="ff-btn ff-btn-ghost ff-btn-sm"
                        onClick={() => void readOne(item.id)}
                      >
                        Okundu
                      </button>
                    ) : null}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="ff-btn ff-btn-outline ff-btn-sm"
                        aria-label={`${item.title} bildirimini aç`}
                      >
                        Aç
                        <MaterialIcon name="open_in_new" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AccountShell>
  );
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}