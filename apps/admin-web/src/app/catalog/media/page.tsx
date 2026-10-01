'use client';

import { useCallback, useEffect, useState } from 'react';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { ActionButton, KeylineCard } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import { CATALOG_SCOPE } from '../../../lib/catalog-ops';
import { uploadProductImage } from '../../../lib/product-media-upload';
import { adminMediaListSchema, adminMediaSchema, adminProductsSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

type ProductOpt = { id: string; name: string };
type MediaRow = { id: string; url?: string; altText?: string | null };

export default function CatalogMediaPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [products, setProducts] = useState<LoadState<ProductOpt[]>>({ status: 'loading' });
  const [productId, setProductId] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshMedia = useCallback(async (id: string) => {
    if (!id) {
      setMediaRows([]);
      return;
    }
    const listed = await createAdminClient().request({
      path: `admin/products/${id}/media`,
      schema: adminMediaListSchema,
    });
    setMediaRows(listed.data);
  }, []);

  const load = useCallback(async () => {
    setProducts({ status: 'loading' });
    try {
      const res = await createAdminClient().request({
        path: 'admin/products',
        schema: adminProductsSchema,
      });
      if (res.data.length === 0) {
        setProducts({ status: 'empty' });
        markSynced();
        return;
      }
      const rows = res.data.map((p) => ({ id: p.id, name: p.name }));
      setProducts({ status: 'ready', data: rows });
      const nextId = productId || rows[0]?.id || '';
      if (!productId && nextId) setProductId(nextId);
      if (nextId) await refreshMedia(nextId);
      markSynced();
    } catch (error) {
      setProducts({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced, productId, refreshMedia]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  async function attach() {
    setBusy(true);
    setFormError(null);
    setFlash(null);
    const order = Number(displayOrder);
    if (!productId) {
      setFormError('Ürün zorunlu.');
      setBusy(false);
      return;
    }
    if (!file && !url.trim()) {
      setFormError('Görsel dosyası veya URL zorunlu.');
      setBusy(false);
      return;
    }
    if (!Number.isInteger(order) || order < 0) {
      setFormError('Sıra 0 veya pozitif tam sayı olmalı.');
      setBusy(false);
      return;
    }
    try {
      if (file) {
        await uploadProductImage({
          productId,
          file,
          altText: altText.trim() || undefined,
          displayOrder: order,
        });
        setFile(null);
        setFlash('Görsel yüklendi.');
      } else {
        await createAdminClient().request({
          method: 'POST',
          path: `admin/products/${productId}/media`,
          body: {
            url: url.trim(),
            altText: altText.trim() || undefined,
            displayOrder: order,
          },
          schema: adminMediaSchema,
        });
        setFlash('Medya URL eklendi.');
        setUrl('');
      }
      await refreshMedia(productId);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-page">
      <p className="ops-page__lede">
        `{CATALOG_SCOPE}` · dosya `POST .../media/upload` · URL `POST .../media` · `catalog.media.write`
      </p>
      <OpsBoundary
        state={products}
        emptyTitle="Ürün yok"
        emptyDescription="Önce katalogda ürün oluşturun."
        onRetry={() => void load()}
      >
        {(rows) => (
          <KeylineCard title="Ürün görseli">
            <div className="ops-form">
              <label className="ops-field">
                Ürün
                <select
                  className="ops-select"
                  aria-label="Ürün"
                  value={productId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setProductId(next);
                    void refreshMedia(next);
                  }}
                >
                  {rows.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {mediaRows.length > 0 ? (
                <div className="ops-form">
                  {mediaRows.map((row) =>
                    row.url ? (
                      <img key={row.id} src={row.url} alt={row.altText ?? ''} width={96} height={96} />
                    ) : null,
                  )}
                </div>
              ) : (
                <p className="ops-page__lede">Bu üründe görsel yok.</p>
              )}
              <label className="ops-field">
                Dosya
                <input
                  className="ops-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  aria-label="Ürün görseli dosyası"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="ops-field">
                URL (isteğe bağlı)
                <input
                  className="ops-input"
                  value={url}
                  aria-label="Medya URL"
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <label className="ops-field">
                Alt text
                <input
                  className="ops-input"
                  value={altText}
                  aria-label="Alt text"
                  onChange={(e) => setAltText(e.target.value)}
                />
              </label>
              <label className="ops-field">
                Sıra
                <input
                  className="ops-input"
                  value={displayOrder}
                  inputMode="numeric"
                  aria-label="Medya sırası"
                  onChange={(e) => setDisplayOrder(e.target.value)}
                />
              </label>
              <ActionButton variant="primary" onClick={() => void attach()} disabled={busy}>
                {busy ? 'Ekleniyor' : 'Ekle'}
              </ActionButton>
              {flash ? (
                <p className="ops-flash ops-flash--ok" role="status">
                  {flash}
                </p>
              ) : null}
              {formError ? (
                <p className="ops-flash ops-flash--err" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </KeylineCard>
        )}
      </OpsBoundary>
    </div>
  );
}
