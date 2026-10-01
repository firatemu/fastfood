'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import {
  fetchSupport,
  openSupport,
  sendSupportMessage,
  type SupportConversation,
} from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { ShopError, ShopSkeleton } from './shop-states';

export function SupportPage() {
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? undefined;
  const [convo, setConvo] = useState<SupportConversation | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const opened = await openSupport(orderId);
      const full = opened.messages ? opened : await fetchSupport(opened.id);
      setConvo(full);
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, [orderId]);

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

  async function send() {
    if (!convo || sending) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const requestId = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await sendSupportMessage(convo.id, text, requestId);
      setBody('');
      setConvo(await fetchSupport(convo.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error' || !convo) {
    return (
      <RequireCustomer>
        <ShopError title="Destek" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
      </RequireCustomer>
    );
  }

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="support">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 min-w-0 flex flex-col gap-space-md">
            <h1 className="font-headline-md uppercase">Canlı destek</h1>
            {convo.orderId ? (
              <p className="font-body-sm text-on-surface-variant">Sipariş bağlantısı var.</p>
            ) : null}
            <ul className="rounded-xl bg-surface-container p-space-md flex flex-col gap-3 min-h-64 max-h-[28rem] overflow-y-auto" data-ff-support-thread>
              {(convo.messages ?? []).length === 0 ? (
                <li className="font-body-md text-on-surface-variant">Henüz mesaj yok.</li>
              ) : (
                (convo.messages ?? []).map((message) => (
                  <li
                    key={message.id}
                    className={
                      message.senderType === 'CUSTOMER'
                        ? 'self-end max-w-[85%] rounded-lg bg-secondary-container text-on-secondary-container p-3'
                        : 'self-start max-w-[85%] rounded-lg bg-surface-container-high p-3'
                    }
                    data-ff-support-message={message.senderType}
                  >
                    <p className="font-body-sm whitespace-pre-wrap break-words">{message.body}</p>
                  </li>
                ))
              )}
            </ul>
            {convo.status === 'CLOSED' ? (
              <p className="font-body-sm text-on-surface-variant">Konuşma kapatıldı.</p>
            ) : (
              <form
                className="flex flex-col sm:flex-row gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <input
                  className="flex-1 h-12 px-4 rounded-lg bg-surface-container-low"
                  value={body}
                  maxLength={2000}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Mesajın"
                  data-ff-support-input
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="h-12 px-space-lg rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
                  data-ff-support-send
                >
                  Gönder
                </button>
              </form>
            )}
            {error ? <p className="font-body-sm text-error">{error}</p> : null}
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
