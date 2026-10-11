'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { useSubmitLock } from '../../lib/storefront/account-hooks';
import {
  fetchSupport,
  listSupport,
  openSupport,
  sendSupportMessage,
  type SupportConversation,
} from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

/**
 * Support.
 *
 * A conversation, not a form: the thread is the page's primary surface and the
 * composer sits directly under it. Previous conversations are reachable from
 * the toolbar, backed by the real `listSupport()` endpoint.
 *
 * Polling cadence is unchanged (4s visible / 20s hidden) — this is a layout
 * change, not a transport change.
 */
export function SupportPage() {
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? undefined;
  const { toast } = useAccountUi();

  const [convo, setConvo] = useState<SupportConversation | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [history, setHistory] = useState<SupportConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const opened = await openSupport(orderId);
      const full = opened.messages ? opened : await fetchSupport(opened.id);
      setConvo(full);
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }, [orderId]);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, [load]);

  useEffect(() => {
    if (!convo?.id || typeof document === 'undefined') return;
    const conversationId = convo.id;
    let cancelled = false;
    const tick = async () => {
      const hidden = document.visibilityState === 'hidden';
      await new Promise((resolve) => setTimeout(resolve, hidden ? 20_000 : 4_000));
      if (cancelled) return;
      try {
        setConvo(await fetchSupport(conversationId));
      } catch {
        /* keep last thread */
      }
      if (!cancelled) void tick();
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [convo?.id]);

  // Keep the newest message in view as the thread grows or the poll returns.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [convo?.messages?.length, convo?.id]);

  const toggleHistory = useCallback(async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (!next || history.length > 0) return;
    setHistoryLoading(true);
    try {
      setHistory(await listSupport());
    } catch (err) {
      setError(errorMessage(err));
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
      setError(errorMessage(err));
    }
  }, []);

  const send = useSubmitLock(
    useCallback(
      async (conversationId: string, text: string) => {
        const requestId = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        await sendSupportMessage(conversationId, text, requestId);
        return fetchSupport(conversationId);
      },
      [],
    ),
  );

  const submit = useCallback(async () => {
    if (!convo) return;
    const text = body.trim();
    if (!text) return;
    try {
      const next = await send.run(convo.id, text);
      if (!next) return;
      setBody('');
      setConvo(next);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error('Mesaj gönderilemedi.', message);
    }
  }, [body, convo, send, toast]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error' || !convo) {
    return <ShopError title="Destek" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  const messages = convo.messages ?? [];
  const closed = convo.status === 'CLOSED';

  return (
    <AccountShell
      surface="support"
      eyebrow="Yardım"
      title="Canlı destek"
      description="Siparişinle ilgili bir sorun bildirebilir, durumunu sorabilirsin."
      actions={
        <button
          type="button"
          className="ff-btn ff-btn-outline"
          aria-expanded={historyOpen}
          aria-controls="support-history"
          onClick={() => void toggleHistory()}
        >
          <MaterialIcon name="forum" />
          Konuşmalarım
        </button>
      }
    >
      {historyOpen ? (
        <section className="ff-section" id="support-history">
          <div className="ff-section-head">
            <h2 className="ff-section-title">Önceki konuşmalar</h2>
            <p className="ff-section-desc">
              {historyLoading ? 'Yükleniyor…' : `${history.length} kayıt`}
            </p>
          </div>
          <div className="ff-section-body">
            {history.length === 0 && !historyLoading ? (
              <div className="ff-empty">
                <MaterialIcon name="forum" />
                <p className="ff-empty-title">Kayıtlı konuşman yok</p>
                <p className="ff-empty-text">İlk mesajını yazdığında burada listelenir.</p>
              </div>
            ) : (
              <div className="ff-rows">
                {history.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="ff-row ff-row-select"
                    onClick={() => void switchTo(row.id)}
                    aria-current={row.id === convo.id ? 'true' : undefined}
                  >
                    <div className="ff-row-key">
                      <div className="ff-row-label">
                        {row.orderId ? 'Siparişe bağlı konuşma' : 'Genel konuşma'}
                      </div>
                      <div className="ff-row-hint">{formatWhen(row.createdAt)}</div>
                    </div>
                    <div className="ff-row-actions">
                      <span className="ff-tag" data-tone={row.status === 'CLOSED' ? undefined : 'ok'}>
                        {row.status === 'CLOSED' ? 'Kapandı' : 'Açık'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Konuşma</h2>
          <p className="ff-section-desc">
            {convo.orderId
              ? 'Bu konuşma bir siparişe bağlı.'
              : `Açıldı: ${formatWhen(convo.createdAt)}`}
          </p>
        </div>
        <div className="ff-section-body">
          {/* The thread: the page's primary surface, with the composer below. */}
          <div className="ff-thread ff-scroll" data-ff-support-thread role="log" aria-live="polite">
            {messages.length === 0 ? (
              <p className="ff-row-hint" style={{ padding: '1.5rem 0', textAlign: 'center' }}>
                Henüz mesaj yok. Aşağıdan yazmaya başla.
              </p>
            ) : (
              messages.map((message) => {
                const mine = message.senderType === 'CUSTOMER';
                return (
                  <div
                    key={message.id}
                    className="ff-bubble"
                    data-ff-support-message={message.senderType}
                    data-own={mine ? 'true' : 'false'}
                  >
                    <span className="ff-bubble-meta">
                      {mine ? 'Sen' : 'Destek'} · {formatWhen(message.createdAt)}
                    </span>
                    <p className="ff-bubble-body">{message.body}</p>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {closed ? (
            <div className="ff-notice" data-tone="warn" style={{ marginTop: '0.875rem' }}>
              <MaterialIcon name="lock" />
              <span>Bu konuşma kapatıldı. Yeni bir konuşma açmak için Destek sayfasına dön.</span>
            </div>
          ) : (
            <form
              className="ff-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label className="ff-field" style={{ flex: 1 }}>
                <span className="ff-sr-only">Mesajın</span>
                <input
                  className="ff-input"
                  value={body}
                  maxLength={2000}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Mesajın"
                  data-ff-support-input
                />
              </label>
              <button
                type="submit"
                className="ff-btn ff-btn-primary"
                disabled={send.pending || !body.trim()}
                data-ff-support-send
              >
                {send.pending ? 'Gönderiliyor' : 'Gönder'}
              </button>
            </form>
          )}
        </div>
      </section>

      {error ? (
        <div className="ff-notice" data-tone="danger" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      ) : null}
    </AccountShell>
  );
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}