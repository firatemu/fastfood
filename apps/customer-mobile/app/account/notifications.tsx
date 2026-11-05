import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { EmptyBlock, ErrorBlock, LoadingBlock, SecondaryButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import {
  clearAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/engagement';
import { notifyNotificationsChanged } from '../../lib/notification-events';
import { notificationDestination } from '../../lib/notification-nav';
import { cacheNotifications } from '../../lib/private-cache';
import type { InboxNotification } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { colors, fonts, minTouch, radius, space } from '../../theme';

/**
 * Inbox.
 *
 * Read state is a leading dot plus title weight, not a border colour: colouring
 * every unread row turns a long inbox into a stripe pattern and stops
 * singling out the one item that needs attention. Mirrors the Web inbox.
 *
 * The row is a container and its actions are siblings — the previous version
 * made the whole card one `Pressable`, so a row without a destination could
 * not be marked read on its own.
 */
export default function AccountNotificationsRoute() {
  return (
    <View style={styles.screen}>
      <StackHeader title="Bildirimler" />
      <RequireCustomer next="/account/notifications">
        <InboxBody />
      </RequireCustomer>
    </View>
  );
}

function InboxBody() {
  const router = useRouter();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    void fetchNotifications()
      .then((next) => {
        setItems(next.items);
        setUnreadCount(next.unreadCount);
        cacheNotifications(next.items);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(formatApiError(err));
        setStatus('error');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function markRead(item: InboxNotification) {
    if (item.read) return;
    try {
      const updated = await markNotificationRead(item.id);
      setItems((current) => current.map((row) => (row.id === item.id ? updated : row)));
      setUnreadCount((count) => Math.max(0, count - 1));
      notifyNotificationsChanged();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function onOpen(item: InboxNotification) {
    await markRead(item);
    const dest = notificationDestination(item.href);
    if (dest) router.push(dest as never);
  }

  async function onReadAll() {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((row) => ({ ...row, read: true })));
      setUnreadCount(0);
      notifyNotificationsChanged();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteOne(id: string) {
    try {
      await deleteNotification(id);
      const target = items.find((row) => row.id === id);
      setItems((current) => current.filter((row) => row.id !== id));
      if (target && !target.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      notifyNotificationsChanged();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function onClearAll() {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      await clearAllNotifications();
      setItems([]);
      setUnreadCount(0);
      notifyNotificationsChanged();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') return <LoadingBlock label="Bildirimler yükleniyor…" />;
  if (status === 'error') {
    return <ErrorBlock title="Bildirimler yüklenemedi" message={error ?? ''} onRetry={load} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.topActions}>
        {unreadCount > 0 ? (
          <View style={styles.topActionFlex}>
            <SecondaryButton
              label={busy ? 'İşleniyor…' : `Tümünü Oku (${unreadCount})`}
              onPress={() => void onReadAll()}
            />
          </View>
        ) : null}
        {items.length > 0 ? (
          <View style={unreadCount > 0 ? styles.topActionFlex : undefined}>
            <SecondaryButton
              label={busy ? 'İşleniyor…' : 'Tümünü Sil'}
              onPress={() => void onClearAll()}
            />
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 ? (
        <EmptyBlock title="Bildirim yok" message="Sipariş ve CLUB duyuruları burada görünür." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowHead}>
              <View style={[styles.dot, item.read ? styles.dotRead : styles.dotUnread]} />
              <Text style={[styles.title, item.read && styles.titleRead]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.rowFoot}>
              <Text style={styles.meta}>{formatStorefrontDateTime(item.createdAt)}</Text>
              <View style={styles.itemActions}>
                {item.href ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title} bildirimini aç`}
                    hitSlop={8}
                    onPress={() => void onOpen(item)}
                    style={styles.openLink}
                  >
                    <Text style={styles.openLabel}>Aç</Text>
                  </Pressable>
                ) : !item.read ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title} bildirimini okundu işaretle`}
                    hitSlop={8}
                    onPress={() => void markRead(item)}
                    style={styles.openLink}
                  >
                    <Text style={styles.openLabel}>Okundu işaretle</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} bildirimini sil`}
                  hitSlop={8}
                  onPress={() => void onDeleteOne(item.id)}
                  style={styles.deleteLink}
                >
                  <Text style={styles.deleteLabel}>Sil</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.md,
    gap: 8,
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotUnread: { backgroundColor: colors.flame },
  dotRead: { backgroundColor: colors.outlineVariant },
  title: { flex: 1, fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  titleRead: { color: colors.onSurfaceVariant, fontFamily: fonts.jakartaSemibold },
  body: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash, lineHeight: 20 },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  meta: { flex: 1, fontFamily: fonts.jakarta, fontSize: 11, color: colors.outline },
  openLink: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  openLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    textTransform: 'uppercase',
    color: colors.mustard,
  },
  topActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  topActionFlex: { flex: 1, minWidth: 140 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteLink: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  deleteLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    textTransform: 'uppercase',
    color: colors.error,
  },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
});
