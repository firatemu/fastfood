'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';

import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsToast } from '../../components/ops/ops-toast';
import { createAdminClient } from '../../lib/api';

import styles from './notifications.module.css';

const notificationItemSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  channel: z.string(),
  templateKey: z.string(),
  status: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  target: z.string(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
});

type NotificationItem = z.infer<typeof notificationItemSchema>;

const listNotificationsResponseSchema = z.object({
  items: z.array(notificationItemSchema),
  total: z.number(),
});

const sendNotificationResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  status: z.string(),
});

export default function NotificationsAdminPage() {
  const toast = useOpsToast();
  const [title, setTitle] = useState('BURGER HOME Fırsatı! 🔥');
  const [body, setBody] = useState('Smash burgerlerde bugün geçerli patates ikramın seni bekliyor.');
  const [target, setTarget] = useState<'all' | 'user'>('all');
  const [userId, setUserId] = useState('');
  const [href, setHref] = useState('/deals');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<NotificationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const client = createAdminClient();
      const res = await client.request({
        method: 'GET',
        path: 'admin/notifications',
        schema: listNotificationsResponseSchema,
      });
      setHistory(res.items);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Lütfen başlık ve bildirim metnini doldurun.');
      return;
    }

    try {
      setIsSubmitting(true);
      const client = createAdminClient();
      await client.request({
        method: 'POST',
        path: 'admin/notifications/send',
        schema: sendNotificationResponseSchema,
        body: {
          title: title.trim(),
          body: body.trim(),
          target,
          userId: target === 'user' && userId.trim() ? userId.trim() : undefined,
          href: href.trim() || null,
        },
      });

      toast.success('Bildirim başarıyla gönderildi ve cihazlara iletildi!');
      void fetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bildirim gönderilemedi.';
      toast.error(`Hata: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            PAZARLAMA & FİNANS <span>/</span> BİLDİRİM YÖNETİMİ
          </div>
          <h1>BİLDİRİM YÖNETİMİ</h1>
          <p>Müşteri mobil uygulamalarına anlık push bildirimi ve kampanya duyuruları gönderin.</p>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {/* Form Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <OpsIcon name="send" /> Yeni Push Bildirimi Gönder
          </h2>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Hedef Kitle</label>
              <div className={styles.radioGroup}>
                <div
                  className={`${styles.radioOption} ${target === 'all' ? styles.active : ''}`}
                  onClick={() => setTarget('all')}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={target === 'all'}
                    onChange={() => setTarget('all')}
                  />
                  <span>Tüm Kullanıcılar (Broadcast)</span>
                </div>
                <div
                  className={`${styles.radioOption} ${target === 'user' ? styles.active : ''}`}
                  onClick={() => setTarget('user')}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={target === 'user'}
                    onChange={() => setTarget('user')}
                  />
                  <span>Belirli Müşteri (User ID)</span>
                </div>
              </div>
            </div>

            {target === 'user' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Müşteri ID (UUID)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="01900000-0000-7000-8000-000000000001"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="notif-title" className={styles.formLabel}>Bildirim Başlığı</label>
              <input
                id="notif-title"
                type="text"
                className={styles.input}
                placeholder="Örn: Akşam Menüsü İndirimi! 🔥"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={128}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notif-body" className={styles.formLabel}>Bildirim Metni</label>
              <textarea
                id="notif-body"
                className={styles.textarea}
                rows={3}
                placeholder="Bildirimde görünecek detaylı mesaj..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Uygulama İçi Yönlendirme (Deep Link)</label>
              <select
                className={styles.select}
                value={href}
                onChange={(e) => setHref(e.target.value)}
              >
                <option value="/">Ana Sayfa</option>
                <option value="/deals">Fırsatlar & Kampanyalar (/deals)</option>
                <option value="/account/club">Burger Club (/account/club)</option>
                <option value="/orders">Siparişlerim (/orders)</option>
              </select>
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              <OpsIcon name="send" />
              {isSubmitting ? 'Gönderiliyor...' : 'Şimdi Bildirimi Gönder'}
            </button>
          </form>
        </div>

        {/* Live Phone Preview Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <OpsIcon name="devices" /> Canlı Telefon Önizlemesi
          </h2>
          <p style={{ fontSize: '12px', color: '#889', marginBottom: '16px' }}>
            Bildirim kullanıcının telefonunun kilit ekranında veya üst çekmecesinde böyle görünür:
          </p>

          <div className={styles.previewBox}>
            <div className={styles.previewNotification}>
              <div className={styles.previewHeader}>
                <div className={styles.previewBrand}>
                  <span>🍔</span> BURGER HOME
                </div>
                <div className={styles.previewTime}>Şimdi</div>
              </div>
              <div className={styles.previewTitle}>{title || 'Bildirim Başlığı'}</div>
              <div className={styles.previewBody}>{body || 'Bildirim mesaj metni burada yer alır...'}</div>
              {href && <div className={styles.previewTag}>Yönlendirme: {href}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>Son Gönderilen Bildirimler</h2>
          <button
            type="button"
            onClick={() => void fetchHistory()}
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ff-on-surface)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Yenile
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#889' }}>
            Yükleniyor...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#889' }}>
            Henüz gönderilmiş bildirim bulunmuyor.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Başlık & Mesaj</th>
                <th>Hedef</th>
                <th>Kanal</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#889', marginTop: '2px' }}>
                      {item.body}
                    </div>
                    {item.href && (
                      <span style={{ fontSize: '11px', color: 'var(--amber)' }}>
                        Link: {item.href}
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                      {item.target === 'all' ? 'Tüm Müşteriler' : `Kullanıcı: ${item.userId?.slice(0, 8)}...`}
                    </span>
                  </td>
                  <td>{item.channel}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${item.status === 'SENT' ? styles.badgeSuccess : styles.badgePending}`}
                    >
                      {item.status === 'SENT' ? 'İLETİLDİ' : item.status}
                    </span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
