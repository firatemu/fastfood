'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { useOpsToast } from '../../components/ops/ops-toast';
import { createAdminClient } from '../../lib/api';
import {
  adminSupportConversationDetailSchema,
  adminSupportConversationsSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './support.module.css';

type ConversationSummary = z.infer<typeof adminSupportConversationsSchema>['data'][number];
type ConversationDetail = z.infer<typeof adminSupportConversationDetailSchema>['data'];
type FilterMode = 'all' | 'needsReply' | 'OPEN' | 'CLOSED';

const EMPTY_CONVERSATIONS: ConversationSummary[] = [];

const QUICK_REPLIES = [
  'Merhaba, talebinizi incelemeye aldık. Kısa süre içinde dönüş yapacağız.',
  'Siparişiniz şu an şubemizde özenle hazırlanıyor.',
  'Kuryemiz siparişinizle birlikte adresinize doğru yola çıktı.',
  'Yaşadığınız aksaklık için özür dileriz, konuyu hemen çözüme kavuşturuyoruz.',
  'Başka bir konuda yardımcı olmamızı ister misiniz?',
] as const;

function customerDisplayName(item: ConversationSummary): string {
  return (
    item.customerName?.trim() ||
    item.customerPhone?.trim() ||
    item.customerEmail?.trim() ||
    `Müşteri (${item.userId.slice(0, 8)})`
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function senderPrefix(senderType: string | null | undefined): string {
  if (senderType === 'CUSTOMER') return 'Müşteri: ';
  if (senderType === 'SUPPORT') return 'Destek: ';
  if (senderType === 'SYSTEM') return 'Sistem: ';
  return '';
}

function senderRoleLabel(senderType: 'CUSTOMER' | 'SUPPORT' | 'SYSTEM'): string {
  if (senderType === 'CUSTOMER') return 'Müşteri';
  if (senderType === 'SUPPORT') return 'Destek Temsilcisi';
  return 'Sistem Makbuzu';
}

export default function SupportAdminPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();

  const [listState, setListState] = useState<LoadState<ConversationSummary[]>>({
    status: 'loading',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const selectedIdRef = useRef<string | null>(null);
  const detailRequestSeq = useRef(0);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastCompositionEndRef = useRef<number | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const fetchDetail = useCallback(async (conversationId: string, silent = false) => {
    const seq = ++detailRequestSeq.current;
    if (!silent) {
      setDetailLoading(true);
      setDetailError(null);
    }
    try {
      const res = await createAdminClient().request({
        path: `admin/support/conversations/${conversationId}`,
        query: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        schema: adminSupportConversationDetailSchema,
      });
      if (seq !== detailRequestSeq.current) return;
      setDetail((prev) => {
        if (!prev || prev.id !== res.data.id) return res.data;
        const prevCount = prev.messages?.length ?? 0;
        const nextCount = res.data.messages?.length ?? 0;
        if (prevCount === nextCount && prev.status === res.data.status && prev.updatedAt === res.data.updatedAt) {
          const prevLast = prev.messages?.[prevCount - 1]?.id;
          const nextLast = res.data.messages?.[nextCount - 1]?.id;
          if (prevLast === nextLast) return prev;
        }
        return res.data;
      });
      setDetailError(null);
    } catch (err) {
      if (seq !== detailRequestSeq.current) return;
      if (!silent) {
        setDetailError(errorMessage(err));
      }
    } finally {
      if (seq === detailRequestSeq.current && !silent) {
        setDetailLoading(false);
      }
    }
  }, []);

  const loadList = useCallback(
    async (silent = false) => {
      if (!silent) {
        setListState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
      }
      try {
        const res = await createAdminClient().request({
          path: 'admin/support/conversations',
          query: { status: 'ALL', includeEmpty: 'false', limit: 150, _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          schema: adminSupportConversationsSchema,
        });
        const rows = res.data;
        setListState(rows.length > 0 ? { status: 'ready', data: rows } : { status: 'empty' });
        markSynced();

        const currentId = selectedIdRef.current;
        if (!currentId && rows[0]) {
          setSelectedId(rows[0].id);
          void fetchDetail(rows[0].id, false);
        }
      } catch (err) {
        if (!silent) {
          setListState({ status: 'error', error: err });
        }
        markStale();
      }
    },
    [fetchDetail, markStale, markSynced],
  );

  useEffect(() => {
    registerRefresh(() => void loadList(false));
    return () => registerRefresh(null);
  }, [loadList, registerRefresh]);

  useDeferredLoad(() => void loadList(false), [loadList]);

  const syncSummaryFromDetail = useCallback((updated: ConversationDetail) => {
    setDetail(updated);
    setListState((prev) => {
      if (prev.status !== 'ready') return prev;
      const { messages: _messages, ...summary } = updated;
      const nextList = [summary, ...prev.data.filter((row) => row.id !== updated.id)];
      nextList.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return { status: 'ready', data: nextList };
    });
  }, []);

  // Dedicated fast polling for active conversation detail
  useEffect(() => {
    if (!selectedId || typeof document === 'undefined') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFetching = false;

    const pollDetail = async () => {
      if (cancelled || isFetching) return;
      isFetching = true;
      try {
        const res = await createAdminClient().request({
          path: `admin/support/conversations/${selectedId}`,
          query: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          schema: adminSupportConversationDetailSchema,
        });
        if (!cancelled && res.data) {
          setDetail((prev) => {
            if (!prev || prev.id !== res.data.id) return res.data;
            const prevCount = prev.messages?.length ?? 0;
            const nextCount = res.data.messages?.length ?? 0;
            if (
              prevCount === nextCount &&
              prev.status === res.data.status &&
              prev.updatedAt === res.data.updatedAt
            ) {
              const prevLast = prev.messages?.[prevCount - 1]?.id;
              const nextLast = res.data.messages?.[nextCount - 1]?.id;
              if (prevLast === nextLast) return prev;
            }
            return res.data;
          });
          syncSummaryFromDetail(res.data);
        }
      } catch {
        /* keep last detail */
      } finally {
        isFetching = false;
        if (!cancelled) {
          schedule();
        }
      }
    };

    const schedule = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const delay = isHidden ? 10_000 : 1_500;
      timer = setTimeout(() => {
        void pollDetail();
      }, delay);
    };

    const triggerImmediate = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      void pollDetail();
    };

    schedule();

    window.addEventListener('focus', triggerImmediate);
    document.addEventListener('visibilitychange', triggerImmediate);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', triggerImmediate);
      document.removeEventListener('visibilitychange', triggerImmediate);
    };
  }, [selectedId, syncSummaryFromDetail]);

  // Polling for conversations list
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFetching = false;

    const pollList = async () => {
      if (cancelled || isFetching) return;
      isFetching = true;
      try {
        await loadList(true);
      } finally {
        isFetching = false;
        if (!cancelled) schedule();
      }
    };

    const schedule = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      const waitMs = document.hidden ? 15_000 : 4_000;
      timer = setTimeout(() => {
        void pollList();
      }, waitMs);
    };

    const triggerImmediate = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      void pollList();
    };

    schedule();

    window.addEventListener('focus', triggerImmediate);
    document.addEventListener('visibilitychange', triggerImmediate);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', triggerImmediate);
      document.removeEventListener('visibilitychange', triggerImmediate);
    };
  }, [loadList]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [detail?.id, detail?.messages.length]);

  const conversations = useMemo(
    () => (listState.status === 'ready' ? listState.data : EMPTY_CONVERSATIONS),
    [listState],
  );

  const metrics = useMemo(() => {
    let needsReply = 0;
    let open = 0;
    let closed = 0;
    for (const c of conversations) {
      if (c.needsReply) needsReply += 1;
      if (c.status === 'OPEN') open += 1;
      if (c.status === 'CLOSED') closed += 1;
    }
    return { total: conversations.length, needsReply, open, closed };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return conversations.filter((item) => {
      if (filterMode === 'needsReply' && !item.needsReply) return false;
      if (filterMode === 'OPEN' && item.status !== 'OPEN') return false;
      if (filterMode === 'CLOSED' && item.status !== 'CLOSED') return false;
      if (!q) return true;
      const haystack = [
        item.customerName,
        item.customerPhone,
        item.customerEmail,
        item.orderDisplayNumber,
        item.branchName,
        item.lastMessageBody,
        item.userId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return haystack.includes(q);
    });
  }, [conversations, filterMode, searchQuery]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedId(conversationId);
      setReplyError(null);
      void fetchDetail(conversationId, false);
    },
    [fetchDetail],
  );

  const handleReplySubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedId || sending) return;
      const trimmed = replyBody.trim();
      if (!trimmed) {
        setReplyError('Lütfen göndermek için bir yanıt metni yazın.');
        replyInputRef.current?.focus();
        return;
      }

      try {
        setSending(true);
        setReplyError(null);
        const res = await createAdminClient().request({
          method: 'POST',
          path: `admin/support/conversations/${selectedId}/messages`,
          body: { body: trimmed },
          schema: adminSupportConversationDetailSchema,
        });
        setReplyBody('');
        syncSummaryFromDetail(res.data);
        toast.success('Yanıt müşteriye gönderildi.');
      } catch (err) {
        const msg = errorMessage(err);
        setReplyError(msg);
        toast.error(`Yanıt gönderilemedi: ${msg}`);
      } finally {
        setSending(false);
      }
    },
    [replyBody, selectedId, sending, syncSummaryFromDetail, toast],
  );

  const handleToggleStatus = useCallback(async () => {
    if (!detail || updatingStatus) return;
    const nextStatus = detail.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      setUpdatingStatus(true);
      const res = await createAdminClient().request({
        method: 'PATCH',
        path: `admin/support/conversations/${detail.id}/status`,
        body: { status: nextStatus },
        schema: adminSupportConversationDetailSchema,
      });
      syncSummaryFromDetail(res.data);
      toast.success(
        nextStatus === 'CLOSED' ? 'Görüşme kapatıldı.' : 'Görüşme yeniden açıldı.',
      );
    } catch (err) {
      toast.error(`Görüşme durumu güncellenemedi: ${errorMessage(err)}`);
    } finally {
      setUpdatingStatus(false);
    }
  }, [detail, syncSummaryFromDetail, toast, updatingStatus]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            ŞUBE &amp; MÜŞTERİ <span>/</span> MÜŞTERİ MESAJLARI
          </div>
          <h1>MÜŞTERİ MESAJLARI</h1>
          <p>
            Web ve mobil uygulama üzerinden gelen müşteri destek taleplerini görüntüleyin ve yanıtlayın.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void loadList(false)}
          >
            <OpsIcon name="refresh" />
            <span>Listeyi yenile</span>
          </button>
        </div>
      </div>

      <dl className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiCardAccent}`}>
          <dt className={styles.kpiLabel}>Yanıt Bekleyen</dt>
          <dd className={styles.kpiValue}>{metrics.needsReply}</dd>
        </div>
        <div className={styles.kpiCard}>
          <dt className={styles.kpiLabel}>Açık Görüşmeler</dt>
          <dd className={styles.kpiValue}>{metrics.open}</dd>
        </div>
        <div className={styles.kpiCard}>
          <dt className={styles.kpiLabel}>Kapatılanlar</dt>
          <dd className={styles.kpiValue}>{metrics.closed}</dd>
        </div>
        <div className={styles.kpiCard}>
          <dt className={styles.kpiLabel}>Toplam Görüşme</dt>
          <dd className={styles.kpiValue}>{metrics.total}</dd>
        </div>
      </dl>

      <OpsBoundary
        state={listState}
        emptyTitle="Henüz müşteri mesajı yok"
        emptyDescription="Müşteriler web veya mobil uygulama üzerinden destek mesajı gönderdiğinde burada listelenir."
        onRetry={() => void loadList(false)}
      >
        {() => (
          <div className={styles.workspace}>
            {/* Sol Sütun: Görüşme Listesi */}
            <section className={styles.listPanel} aria-label="Müşteri görüşmeleri">
              <div className={styles.listControls}>
                <search className={styles.searchField}>
                  <label htmlFor="support-search" className={styles.searchLabel}>
                    Görüşmelerde ara
                  </label>
                  <div className={styles.searchWrap}>
                    <span className={styles.searchIcon} aria-hidden="true">
                      <OpsIcon name="search" />
                    </span>
                    <input
                      id="support-search"
                      type="search"
                      className={styles.searchInput}
                      placeholder="Müşteri adı, telefon, sipariş #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>
                </search>

                <div className={styles.filterRow} role="group" aria-label="Durum filtreleri">
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filterMode === 'all' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilterMode('all')}
                  >
                    <span>Tümü</span>
                    <span className={styles.filterCount}>{metrics.total}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filterMode === 'needsReply' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilterMode('needsReply')}
                  >
                    <span>Yanıt Bekleyen</span>
                    <span className={styles.filterCount}>{metrics.needsReply}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filterMode === 'OPEN' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilterMode('OPEN')}
                  >
                    <span>Açık</span>
                    <span className={styles.filterCount}>{metrics.open}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filterMode === 'CLOSED' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilterMode('CLOSED')}
                  >
                    <span>Kapalı</span>
                    <span className={styles.filterCount}>{metrics.closed}</span>
                  </button>
                </div>
              </div>

              <div className={styles.listScroll}>
                {filteredConversations.length === 0 ? (
                  <div className={styles.listEmpty}>
                    Seçili filtre veya arama kriteriyle eşleşen görüşme bulunamadı.
                  </div>
                ) : (
                  filteredConversations.map((item) => {
                    const active = item.id === selectedId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.convoRow} ${active ? styles.convoRowActive : ''}`}
                        onClick={() => handleSelectConversation(item.id)}
                        aria-current={active ? 'true' : undefined}
                      >
                        <div className={styles.convoRowTop}>
                          <span className={styles.convoCustomer}>{customerDisplayName(item)}</span>
                          <span className={styles.convoTime}>
                            {formatDateTime(item.lastMessageAt ?? item.updatedAt)}
                          </span>
                        </div>
                        <div className={styles.convoMetaRow}>
                          {item.needsReply ? (
                            <span className={`${styles.badge} ${styles.badgeNeedsReply}`}>
                              Yanıt Bekliyor
                            </span>
                          ) : item.status === 'OPEN' ? (
                            <span className={`${styles.badge} ${styles.badgeOpen}`}>Açık</span>
                          ) : (
                            <span className={`${styles.badge} ${styles.badgeClosed}`}>Kapalı</span>
                          )}
                          {item.orderDisplayNumber ? (
                            <span className={styles.orderChip}>#{item.orderDisplayNumber}</span>
                          ) : null}
                          {item.branchName ? (
                            <span className={styles.orderChip}>{item.branchName}</span>
                          ) : null}
                        </div>
                        <p className={styles.convoPreview}>
                          {senderPrefix(item.lastMessageSenderType)}
                          {item.lastMessageBody ?? 'Henüz mesaj içeriği yok.'}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* Sağ Sütun: Seçili Görüşme Detayı ve Yanıt Formu */}
            <section className={styles.threadPanel} aria-label="Görüşme detayı">
              {!selectedId ? (
                <div className={styles.placeholderPane}>
                  <OpsIcon name="forum" />
                  <p>Görüntülemek ve yanıtlamak için soldan bir müşteri görüşmesi seçin.</p>
                </div>
              ) : detailLoading && !detail ? (
                <div className={styles.placeholderPane}>
                  <p>Görüşme mesajları yükleniyor…</p>
                </div>
              ) : detailError && !detail ? (
                <div className={styles.placeholderPane}>
                  <p>{detailError}</p>
                  <button
                    type="button"
                    className={styles.statusBtn}
                    onClick={() => void fetchDetail(selectedId, false)}
                  >
                    Tekrar dene
                  </button>
                </div>
              ) : detail ? (
                <>
                  <header className={styles.threadHeader}>
                    <div className={styles.threadIdentity}>
                      <div className={styles.threadTitleRow}>
                        <h2 className={styles.threadTitle}>{customerDisplayName(detail)}</h2>
                        <span
                          className={`${styles.badge} ${
                            detail.status === 'OPEN' ? styles.badgeOpen : styles.badgeClosed
                          }`}
                        >
                          {detail.status === 'OPEN' ? 'Açık' : 'Kapalı'}
                        </span>
                        {detail.needsReply ? (
                          <span className={`${styles.badge} ${styles.badgeNeedsReply}`}>
                            Yanıt Bekliyor
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.threadContact}>
                        {detail.customerPhone ? <span>Tel: {detail.customerPhone}</span> : null}
                        {detail.customerEmail ? <span>E-posta: {detail.customerEmail}</span> : null}
                        <Link href={`/customers/${detail.userId}`} className={styles.inlineLink}>
                          Müşteri profili
                        </Link>
                        {detail.orderId ? (
                          <Link href={`/orders/${detail.orderId}`} className={styles.inlineLink}>
                            Sipariş #{detail.orderDisplayNumber ?? detail.orderId.slice(0, 8)}
                            {detail.branchName ? ` (${detail.branchName})` : ''}
                            {detail.orderStatus ? ` · ${detail.orderStatus}` : ''}
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.threadActions}>
                      <button
                        type="button"
                        className={styles.statusBtn}
                        disabled={updatingStatus}
                        onClick={() => void handleToggleStatus()}
                      >
                        <OpsIcon name={detail.status === 'OPEN' ? 'lock' : 'lock_open'} />
                        <span>
                          {updatingStatus
                            ? 'Güncelleniyor…'
                            : detail.status === 'OPEN'
                              ? 'Görüşmeyi Kapat'
                              : 'Yeniden Aç'}
                        </span>
                      </button>
                    </div>
                  </header>

                  <div className={styles.messagesScroll} role="log" aria-live="polite">
                    {detail.messages.length === 0 ? (
                      <div className={styles.listEmpty}>Bu görüşmede henüz mesaj yok.</div>
                    ) : (
                      detail.messages.map((msg) => {
                        const bubbleClass =
                          msg.senderType === 'CUSTOMER'
                            ? styles.bubbleCustomer
                            : msg.senderType === 'SUPPORT'
                              ? styles.bubbleSupport
                              : styles.bubbleSystem;
                        return (
                          <div key={msg.id} className={`${styles.bubble} ${bubbleClass}`}>
                            <div className={styles.bubbleHeader}>
                              <span>{senderRoleLabel(msg.senderType)}</span>
                              <span>{formatDateTime(msg.createdAt)}</span>
                            </div>
                            <p className={styles.bubbleBody}>{msg.body}</p>
                          </div>
                        );
                      })
                    )}
                    <div ref={threadEndRef} />
                  </div>

                  <div className={styles.composer}>
                    {detail.status === 'CLOSED' ? (
                      <p className={styles.closedNote}>
                        Bu görüşme kapatılmış durumda. Yanıt gönderirseniz görüşme otomatik olarak yeniden açılır.
                      </p>
                    ) : null}

                    <div className={styles.quickReplies}>
                      {QUICK_REPLIES.map((template) => (
                        <button
                          key={template}
                          type="button"
                          className={styles.quickReplyBtn}
                          onClick={() => {
                            setReplyBody(template);
                            setReplyError(null);
                            replyInputRef.current?.focus();
                          }}
                        >
                          {template}
                        </button>
                      ))}
                    </div>

                    <form
                      className={styles.replyForm}
                      noValidate
                      onSubmit={(e) => void handleReplySubmit(e)}
                    >
                      <div className={styles.replyLabelRow}>
                        <label htmlFor="support-reply-input" className={styles.replyLabel}>
                          Müşteriye Yanıt Yaz
                        </label>
                        <span className={styles.replyHint}>
                          Gönder: Enter · Yeni satır: Shift + Enter
                        </span>
                      </div>
                      <div className={styles.replyControls}>
                        <textarea
                          id="support-reply-input"
                          ref={replyInputRef}
                          name="body"
                          className={styles.replyTextarea}
                          placeholder="Müşteriye iletilecek yanıtınızı yazın…"
                          value={replyBody}
                          maxLength={2000}
                          required
                          aria-invalid={replyError ? 'true' : undefined}
                          aria-describedby={replyError ? 'support-reply-error' : undefined}
                          disabled={sending}
                          onChange={(e) => {
                            setReplyBody(e.target.value);
                            if (replyError) setReplyError(null);
                          }}
                          onCompositionEnd={(e) => {
                            lastCompositionEndRef.current = e.timeStamp;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (
                                e.nativeEvent.isComposing ||
                                (lastCompositionEndRef.current !== null &&
                                  Math.abs(e.timeStamp - lastCompositionEndRef.current) < 50)
                              ) {
                                return;
                              }
                              e.currentTarget.form?.requestSubmit();
                            }
                          }}
                        />
                        <button type="submit" className={styles.sendBtn} disabled={sending}>
                          <OpsIcon name="send" />
                          <span>{sending ? 'Gönderiliyor…' : 'Yanıtla'}</span>
                        </button>
                      </div>
                      {replyError ? (
                        <div id="support-reply-error" role="status" className={styles.closedNote}>
                          {replyError}
                        </div>
                      ) : null}
                    </form>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        )}
      </OpsBoundary>
    </div>
  );
}
