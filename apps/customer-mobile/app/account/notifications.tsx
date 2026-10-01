import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { EmptyBlock, ErrorBlock, LoadingBlock, SecondaryButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../lib/engagement';
import { notificationDestination } from '../../lib/notification-nav';
import { cacheNotifications } from '../../lib/private-cache';
import type { InboxNotification } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { colors, fonts, minTouch, radius, space } from '../../theme';

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

  async function onOpen(item: InboxNotification) {
    if (!item.read) {
      try {
        const updated = await markNotificationRead(item.id);
        setItems((current) => current.map((row) => (row.id === item.id ? updated : row)));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (err) {
        setError(formatApiError(err));
      }
    }
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
      {unreadCount > 0 ? (
        <SecondaryButton
          label={busy ? 'İşleniyor…' : `Tümünü okundu işaretle (${unreadCount})`}
          onPress={() => void onReadAll()}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 ? (
        <EmptyBlock title="Bildirim yok" message="Sipariş ve CLUB duyuruları burada görünür." />
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: !item.read }}
            accessibilityLabel={`${item.read ? 'Okundu' : 'Okunmamış'}: ${item.title}`}
            onPress={() => void onOpen(item)}
            style={[styles.card, !item.read && styles.unread]}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{formatStorefrontDateTime(item.createdAt)}</Text>
          </Pressable>
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
    borderRadius: radius.lg,
    padding: space.md,
    gap: 4,
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  unread: { borderColor: colors.mustard },
  title: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  body: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash, lineHeight: 20 },
  meta: { fontFamily: fonts.jakarta, fontSize: 11, color: colors.outline },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
});
