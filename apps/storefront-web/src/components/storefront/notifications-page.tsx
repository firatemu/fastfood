'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { notifyNotificationsChanged } from '../../lib/notification-events';
import {
  clearAllNotifications,
  deleteNotification,
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

  const deleteOne = useCallback(
    async (id: string) => {
      try {
        await deleteNotification(id);
        const target = items.find((row) => row.id === id);
        setItems((rows) => rows.filter((row) => row.id !== id));
        if (target && !target.read) {
          setUnread((count) => Math.max(0, count - 1));
        }
        notifyNotificationsChanged();
        toast.ok('Bildirim silindi.');
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        toast.error('Bildirim silinemedi.', message);
      }
    },
    [items, toast],
  );

  const clearAll = useCallback(async () => {
    if (!window.confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      await clearAllNotifications();
      setItems([]);
      setUnread(0);
      notifyNotificationsChanged();
      toast.ok('Tüm bildirimler silindi.');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error('Bildirimler silinemedi.', message);
    }
  }, [toast]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return (
      <ShopError
        title="Bildirimler"
        message={error ?? 'Yüklenemedi.'}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <AccountShell
      surface="notifications"
      eyebrow="Hesap Merkezi"
      title="Bildirimler & Mesajlar"
      description={
        unread > 0
          ? `${unread} yeni bildiriminiz bulunuyor.`
          : 'Siparişleriniz, kampanyalarınız ve üyelik avantajlarınıza ilişkin tüm duyurular.'
      }
      actions={
        <div className="flex items-center gap-2">
          {unread > 0 ? (
            <button
              type="button"
              className="ff-btn ff-btn-outline"
              onClick={() => void readAll()}
              data-ff-notifications-read-all
            >
              <MaterialIcon name="mark_email_read" />
              Tümünü Okundu İşaretle
            </button>
          ) : null}
          {items.length > 0 ? (
            <button
              type="button"
              className="ff-btn ff-btn-outline text-error hover:bg-error/10 hover:border-error/40"
              onClick={() => void clearAll()}
              data-ff-notifications-clear-all
            >
              <MaterialIcon name="delete_sweep" />
              Tümünü Sil
            </button>
          ) : null}
        </div>
      }
    >
      {error ? (
        <div className="ff-notice mb-4" data-tone="danger" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="ff-card">
        <div className="ff-card-header">
          <div>
            <h2 className="ff-card-title">
              <MaterialIcon name="notifications" />
              Gelen Bildirim Kutusu
            </h2>
            <p className="ff-card-desc">
              {items.length === 0 ? 'Gelen kutunuzda bildirim bulunmuyor.' : `${items.length} bildirim listeleniyor.`}
            </p>
          </div>
          {unread > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
              {unread} Okunmamış
            </span>
          ) : (
            <span className="text-xs text-on-surface-variant font-medium">Hepsi okundu</span>
          )}
        </div>

        <div>
          {items.length === 0 ? (
            <div className="ff-empty">
              <MaterialIcon name="notifications_none" />
              <p className="ff-empty-title">Henüz bildiriminiz yok</p>
              <p className="ff-empty-text">Sipariş durumları ve size özel fırsatlar burada listelenecektir.</p>
            </div>
          ) : (
            <div className="ff-rows" data-ff-notification-list>
              {items.map((item) => (
                <div
                  className="ff-inbox-row transition-colors"
                  key={item.id}
                  data-ff-notification={item.read ? 'read' : 'unread'}
                  data-unread={item.read ? 'false' : 'true'}
                >
                  <span aria-hidden className="ff-inbox-dot" />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="ff-inbox-title font-semibold">{item.title}</p>
                      <span className="ff-inbox-when text-xs">{formatWhen(item.createdAt)}</span>
                    </div>
                    <p className="ff-inbox-body mt-1">{item.body}</p>
                  </div>

                  <div className="ff-row-actions flex items-center gap-2 pl-2">
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
                    <button
                      type="button"
                      className="ff-btn ff-btn-ghost ff-btn-sm text-on-surface-variant hover:text-error hover:bg-error/10"
                      onClick={() => void deleteOne(item.id)}
                      aria-label="Bildirimi sil"
                      title="Bildirimi sil"
                      data-ff-notification-delete={item.id}
                    >
                      <MaterialIcon name="delete_outline" />
                    </button>
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
