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
    useCallback(async (conversationId: string, text: string) => {
      const requestId = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await sendSupportMessage(conversationId, text, requestId);
      return fetchSupport(conversationId);
    }, []),
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
    return (
      <ShopError title="Destek" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
    );
  }

  const messages = convo.messages ?? [];
  const closed = convo.status === 'CLOSED';

  return (
    <AccountShell
      surface="support"
      eyebrow="Müşteri İletişim Merkezi"
      title="Canlı Destek & Yardım"
      description="Siparişinle ilgili soru sorabilir, eksik veya geciken teslimatlar için anında canlı destek ekibimizle görüşebilirsin."
      actions={
        <button
          type="button"
          className="ff-btn ff-btn-outline"
          aria-expanded={historyOpen}
          aria-controls="support-history"
          onClick={() => void toggleHistory()}
        >
          <MaterialIcon name="forum" />
          Konuşma Geçmişi
        </button>
      }
    >
      {historyOpen ? (
        <section className="ff-card mb-6" id="support-history">
          <div className="ff-card-header">
            <div>
              <h2 className="ff-card-title">
                <MaterialIcon name="history" />
                Önceki Konuşmalarım
              </h2>
              <p className="ff-card-desc">
                {historyLoading ? 'Konuşmalar yükleniyor…' : `${history.length} kayıtlı görüşme`}
              </p>
            </div>
          </div>
          <div>
            {history.length === 0 && !historyLoading ? (
              <div className="ff-empty">
                <MaterialIcon name="forum" />
                <p className="ff-empty-title">Kayıtlı görüşmeniz bulunmuyor</p>
                <p className="ff-empty-text">Yeni bir mesaj yazdığınızda görüşme geçmişiniz burada listelenir.</p>
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
                        {row.orderId ? 'Siparişe Bağlı Destek Talebi' : 'Genel Müşteri Görüşmesi'}
                      </div>
                      <div className="ff-row-hint">{formatWhen(row.createdAt)}</div>
                    </div>
                    <div className="ff-row-actions">
                      <span
                        className="ff-tag"
                        data-tone={row.status === 'CLOSED' ? undefined : 'ok'}
                      >
                        {row.status === 'CLOSED' ? 'Kapatıldı' : 'Aktif'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sol 2 Sütun: Sohbet Alanı */}
        <div className="lg:col-span-2">
          <div className="ff-card flex flex-col h-[520px]">
            {/* Destek Başlığı ve Temsilci Durumu */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold">
                    <MaterialIcon name="support_agent" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ok border-2 border-surface-container" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Burger Home Destek
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ok px-2 py-0.5 rounded-full bg-ok/15">
                      Çevrimiçi
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {convo.orderId ? 'Sipariş destek kanalı' : 'Ortalama yanıt: 1-2 dakika'}
                  </div>
                </div>
              </div>

              <span className="text-xs text-on-surface-variant">
                {formatWhen(convo.createdAt)}
              </span>
            </div>

            {/* Mesaj Akışı */}
            <div
              className="ff-thread ff-scroll flex-1 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/60 p-4 space-y-3 overflow-y-auto"
              data-ff-support-thread
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                  <MaterialIcon name="chat" className="text-3xl text-secondary mb-2" />
                  <p className="text-sm font-semibold text-white">Canlı Desteğe Hoş Geldin</p>
                  <p className="text-xs max-w-sm mt-1">
                    Siparişin, teslimatın veya menüyle ilgili her türlü konuda sana yardımcı olmak için buradayız.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.senderType === 'CUSTOMER';
                  return (
                    <div
                      key={message.id}
                      className={`ff-bubble max-w-[80%] rounded-2xl p-3.5 ${
                        mine
                          ? 'ml-auto bg-secondary text-on-secondary-container shadow-md'
                          : 'mr-auto bg-surface-container-high text-white border border-outline-variant/60'
                      }`}
                      data-ff-support-message={message.senderType}
                      data-own={mine ? 'true' : 'false'}
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
                        <span>{mine ? 'Sen' : 'Destek Temsilcisi'}</span>
                        <span>{formatWhen(message.createdAt)}</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Hızlı Yardım Butonları */}
            <div className="flex items-center gap-2 pt-3 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setBody('Siparişim nerede, gecikti mi?')}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-highest text-white border border-outline-variant/60 whitespace-nowrap transition cursor-pointer"
              >
                🛵 Siparişim nerede?
              </button>
              <button
                type="button"
                onClick={() => setBody('Siparişimde eksik ürün var.')}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-highest text-white border border-outline-variant/60 whitespace-nowrap transition cursor-pointer"
              >
                🍔 Eksik ürün var
              </button>
              <button
                type="button"
                onClick={() => setBody('Kuryeye teslimat notu iletmek istiyorum.')}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-highest text-white border border-outline-variant/60 whitespace-nowrap transition cursor-pointer"
              >
                📝 Kurye notu
              </button>
            </div>

            {/* Mesaj Gönderme Formu */}
            {closed ? (
              <div className="ff-notice mt-3" data-tone="warn">
                <MaterialIcon name="lock" />
                <span>Bu görüşme kapatıldı. Yeni bir konu için destek menüsünden yeni sohbet açabilirsiniz.</span>
              </div>
            ) : (
              <form
                className="flex items-center gap-2 mt-3 pt-2 border-t border-outline-variant/40"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <input
                  className="ff-input flex-1"
                  placeholder="Mesajınızı buraya yazınız..."
                  value={body}
                  maxLength={2000}
                  disabled={send.pending}
                  onChange={(event) => setBody(event.target.value)}
                  data-ff-support-input
                />
                <button
                  type="submit"
                  className="ff-btn ff-btn-primary"
                  disabled={send.pending || !body.trim()}
                  data-ff-support-send
                >
                  <MaterialIcon name="send" />
                  {send.pending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sağ Sütun: Destek Bilgileri & Telefon */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="ff-card">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <MaterialIcon name="phone_in_talk" />
              Müşteri Hizmetleri
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              Acil durumlarda çağrı merkezimizden de bize ulaşabilirsin.
            </p>
            <div className="p-3.5 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-secondary">Telefon Hattı</div>
                <div className="text-sm font-bold text-white mt-0.5">0850 308 00 00</div>
              </div>
              <a
                href="tel:08503080000"
                className="ff-btn ff-btn-outline ff-btn-sm"
              >
                Ara
              </a>
            </div>
          </div>

          <div className="ff-card">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <MaterialIcon name="schedule" />
              Hizmet Saatleri
            </h3>
            <div className="text-xs text-on-surface-variant space-y-2 mt-2">
              <div className="flex justify-between">
                <span>Hafta İçi:</span>
                <span className="font-semibold text-white">11:30 - 01:00</span>
              </div>
              <div className="flex justify-between">
                <span>Hafta Sonu:</span>
                <span className="font-semibold text-white">11:30 - 03:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
