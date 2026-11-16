import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FormField } from '../../components/form-field';
import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  MustardButton,
  SecondaryButton,
} from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchSupport, listSupport, openSupport, sendSupportMessage } from '../../lib/engagement';
import {
  clampSupportBody,
  dedupeSupportMessages,
  isSystemSender,
  newClientRequestId,
  supportSenderLabel,
} from '../../lib/engagement-map';
import type { SupportConversation } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { decideSupportPoll } from '../../lib/tracking-poll';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function AccountSupportRoute() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const next = orderId ? `/account/support?orderId=${orderId}` : '/account/support';
  return (
    <View style={styles.screen}>
      <StackHeader title="Destek" />
      <RequireCustomer next={next}>
        <SupportBody orderId={orderId} />
      </RequireCustomer>
    </View>
  );
}

function SupportBody(props: { orderId?: string }) {
  const [convo, setConvo] = useState<SupportConversation | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  // Web parity: the thread is the primary surface, but previous conversations
  // stay reachable. `listSupport()` already exists in lib/engagement; the Web
  // toolbar carries the toggle, and a StackHeader has no action slot, so the
  // toggle lives above the thread instead.
  const [history, setHistory] = useState<SupportConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    void (async () => {
      try {
        const opened = await openSupport(props.orderId);
        const full = opened.messages ? opened : await fetchSupport(opened.id);
        setConvo(full);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
  }, [props.orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!convo?.id) return;
    const conversationId = convo.id;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFetching = false;

    const poll = async () => {
      if (cancelled || isFetching) return;
      isFetching = true;
      try {
        const next = await fetchSupport(conversationId);
        if (!cancelled && next) {
          setConvo((prev) => {
            if (!prev) return next;
            const prevCount = prev.messages?.length ?? 0;
            const nextCount = next.messages?.length ?? 0;
            if (prevCount === nextCount && prev.status === next.status) {
              const prevLast = prev.messages?.[prevCount - 1]?.id;
              const nextLast = next.messages?.[nextCount - 1]?.id;
              if (prevLast === nextLast) return prev;
            }
            return next;
          });
        }
      } catch {
        /* keep last thread */
      } finally {
        isFetching = false;
        if (!cancelled) schedule();
      }
    };

    const schedule = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      const decision = decideSupportPoll({
        conversationId,
        appActive: AppState.currentState === 'active',
        mounted: !cancelled,
      });
      const waitMs = decision.intervalMs;
      if (decision.pace === 'stop' || waitMs == null) return;
      timer = setTimeout(() => {
        void poll();
      }, waitMs);
    };

    if (AppState.currentState === 'active') {
      void poll();
    } else {
      schedule();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [convo?.id, appActive]);

  const toggleHistory = useCallback(async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (!next || history.length > 0) return;
    setHistoryLoading(true);
    try {
      setHistory(await listSupport());
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [history.length, historyOpen]);

  const switchTo = useCallback(async (id: string) => {
    setHistoryOpen(false);
    setError(null);
    try {
      setConvo(await fetchSupport(id));
    } catch (err) {
      setError(formatApiError(err));
    }
  }, []);

  async function send() {
    if (!convo || sending) return;
    const text = clampSupportBody(body);
    if (!text) return;
    setSending(true);
    try {
      await sendSupportMessage(convo.id, text, newClientRequestId('msg'));
      setBody('');
      setConvo(await fetchSupport(convo.id));
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSending(false);
    }
  }

  if (status === 'loading') return <LoadingBlock label="Destek yükleniyor…" />;
  if (status === 'error' && !convo) {
    return <ErrorBlock title="Destek açılamadı" message={error ?? ''} onRetry={load} />;
  }
  if (!convo) {
    return (
      <View style={styles.padded}>
        <EmptyBlock title="Konuşma yok" message="Destek talebi oluşturulamıyor." />
      </View>
    );
  }

  const messages = dedupeSupportMessages(convo.messages ?? []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <SecondaryButton
          label={historyOpen ? 'Konuşmalarımı kapat' : 'Konuşmalarım'}
          onPress={() => void toggleHistory()}
        />

        {historyOpen ? (
          <View style={styles.panel}>
            <Text style={styles.sender}>Önceki konuşmalar</Text>
            <Text style={styles.meta}>
              {historyLoading ? 'Yükleniyor…' : `${history.length} kayıt`}
            </Text>
            {history.length === 0 && !historyLoading ? (
              <EmptyBlock
                title="Kayıtlı konuşman yok"
                message="İlk mesajını yazdığında burada listelenir."
              />
            ) : (
              history.map((row) => (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  onPress={() => void switchTo(row.id)}
                  style={[styles.historyRow, row.id === convo.id ? styles.historyRowActive : null]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.body}>
                      {row.orderId ? 'Siparişe bağlı konuşma' : 'Genel konuşma'}
                    </Text>
                    <Text style={styles.meta}>{formatStorefrontDateTime(row.createdAt)}</Text>
                  </View>
                  <Text style={row.status === 'CLOSED' ? styles.meta : styles.sender}>
                    {row.status === 'CLOSED' ? 'Kapandı' : 'Açık'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {props.orderId ? <Text style={styles.meta}>Sipariş bağlamı bağlı.</Text> : null}
        {messages.length === 0 ? (
          <EmptyBlock title="Mesaj yok" message="Sorunu yaz; ilk yanıt sistem makbuzudur." />
        ) : (
          messages.map((message) => {
            const system = isSystemSender(message.senderType);
            const support = message.senderType.toUpperCase() === 'SUPPORT';
            const bubbleStyle = system ? styles.system : support ? styles.support : styles.mine;
            return (
              <View key={message.id} style={[styles.bubble, bubbleStyle]}>
                <Text style={styles.sender}>{supportSenderLabel(message.senderType)}</Text>
                <Text style={styles.body}>{message.body}</Text>
                <Text style={styles.meta}>{formatStorefrontDateTime(message.createdAt)}</Text>
              </View>
            );
          })
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {convo.status === 'CLOSED' ? (
          <View style={styles.panel}>
            <Text style={styles.meta}>
              Bu görüşme kapatıldı. Yeni bir talep için destek ekranını yeniden açabilirsiniz.
            </Text>
          </View>
        ) : (
          <>
            <FormField
              label="Mesaj"
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={2000}
              accessibilityLabel="Destek mesajı"
              placeholder="Mesajını yaz"
            />
            <MustardButton
              label={sending ? 'Gönderiliyor…' : 'Gönder'}
              loading={sending}
              disabled={!clampSupportBody(body)}
              onPress={() => void send()}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  bubble: { borderRadius: radius.md, padding: space.md, gap: 4 },
  system: { backgroundColor: colors.surfaceLow },
  support: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.mustard,
  },
  mine: { backgroundColor: colors.surfaceHigh },
  sender: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.mustard,
    textTransform: 'uppercase',
  },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  meta: { fontFamily: fonts.jakarta, fontSize: 11, color: colors.ash },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  panel: {
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: minTouch,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  historyRowActive: { backgroundColor: colors.surfaceHigh },
});
