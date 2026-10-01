'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { ReactElement } from 'react';
import { z } from 'zod';

import { AsyncBoundary, errorMessage, type LoadState } from '../../../components/async-boundary';
import { OpsIcon } from '../../../components/ops/ops-icon';
import { ProductsDataGrid } from '../../../components/ops/products-data-grid';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { ActionButton, OpsEmpty } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import {
  filterCatalogProducts,
  parseTryMajorToMinor,
  slugFromName,
  type ProductActiveFilter,
  type ProductSort,
} from '../../../lib/catalog-ops';
import { uploadProductImage } from '../../../lib/product-media-upload';
import {
  adminCategoriesSchema,
  adminMediaListSchema,
  adminMediaSchema,
  adminProductsSchema,
  envelope,
  productCreateSchema,
} from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';
import styles from './products.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Product = z.infer<typeof adminProductsSchema>['data'][number];
type Category = { id: string; name: string };
type MediaRow = z.infer<typeof adminMediaListSchema>['data'][number];

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; productId: string; initialActive: boolean }
  | { kind: 'delete'; productIds: string[] };

type EditFormState = {
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  basePriceMajor: string;
  isActive: boolean;
  displayOrder: string;
};

type EditMediaState = {
  rows: MediaRow[];
  busy: boolean;
  url: string;
  alt: string;
  file: File | null;
  flash: { tone: 'ok' | 'err'; text: string } | null;
};

const SELECTED_STORAGE_KEY = 'ff-ops-selected-products';

function loadSelected(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(SELECTED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function persistSelected(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SELECTED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* storage may be unavailable; the in-memory state remains the truth. */
  }
}

function makeEmptyEditMedia(): EditMediaState {
  return { rows: [], busy: false, url: '', alt: '', file: null, flash: null };
}

// ---------------------------------------------------------------------------
// Top-level page
// ---------------------------------------------------------------------------

export default function CatalogProductsPage(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [, startTransition] = useTransition();

  const [state, setState] = useState<LoadState<Product[]>>({ status: 'loading' });
  const [categories, setCategories] = useState<Category[]>([]);

  const [q, setQ] = useState(() => searchParams?.get('q') ?? '');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    () => searchParams?.get('category') ?? '',
  );
  const [active, setActive] = useState<ProductActiveFilter>(
    () => (searchParams?.get('active') as ProductActiveFilter | null) ?? '',
  );
  const [sort, setSort] = useState<ProductSort>(
    () => (searchParams?.get('sort') as ProductSort | null) ?? 'order',
  );

  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [editForm, setEditForm] = useState<EditFormState>(() => ({
    categoryId: '',
    slug: '',
    name: '',
    description: '',
    basePriceMajor: '99,90',
    isActive: true,
    displayOrder: '0',
  }));
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [archiveAcknowledged, setArchiveAcknowledged] = useState(false);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false);
  const [editMedia, setEditMedia] = useState<EditMediaState>(makeEmptyEditMedia);

  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [createDescription, setCreateDescription] = useState('');
  const [createPriceMajor, setCreatePriceMajor] = useState('99,90');
  const [createCategoryId, setCreateCategoryId] = useState('');
  const [createDisplayOrder, setCreateDisplayOrder] = useState('0');

  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => loadSelected());

  const debouncedQ = useDeferredValue(q.trim());

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const load = useCallback(async (): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const [products, cats] = await Promise.all([
        client.request({
          path: 'admin/products',
          schema: adminProductsSchema,
        }),
        client.request({ path: 'admin/categories', schema: adminCategoriesSchema }),
      ]);
      const catRows = cats.data.map((c) => ({ id: c.id, name: c.name }));
      setCategories(catRows);
      setCreateCategoryId((prev) => prev || catRows[0]?.id || '');
      if (products.data.length === 0) setState({ status: 'empty' });
      else setState({ status: 'ready', data: products.data });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  // URL sync.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    if (categoryFilter) params.set('category', categoryFilter);
    if (active) params.set('active', active);
    if (sort !== 'order') params.set('sort', sort);
    const qs = params.toString();
    const next = qs ? `?${qs}` : window.location.pathname;
    if (`${window.location.search}` !== (qs ? `?${qs}` : '')) {
      startTransition(() => router.replace(next, { scroll: false }));
    }
  }, [debouncedQ, categoryFilter, active, sort, router, startTransition]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const rows = useMemo(() => {
    if (state.status !== 'ready') return [] as Product[];
    return filterCatalogProducts(state.data, {
      q: debouncedQ,
      categoryId: categoryFilter,
      active,
      sort,
    });
  }, [active, categoryFilter, debouncedQ, sort, state]);

  const metrics = useMemo(() => {
    if (state.status !== 'ready') {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        avgPriceMinor: '0',
        topCategory: null as Category | null,
      };
    }
    const list = state.data;
    const activeCount = list.filter((p) => p.isActive !== false).length;
    const inactiveCount = list.length - activeCount;
    const totals = list.reduce<{
      sumMinor: bigint;
      count: number;
      byCategory: Map<string, number>;
    }>(
      (acc, p) => {
        if (p.basePriceMinor !== undefined && p.basePriceMinor !== null) {
          try {
            acc.sumMinor += BigInt(p.basePriceMinor);
            acc.count += 1;
          } catch {
            /* skip malformed rows */
          }
        }
        const cat = p.categoryId ?? 'unassigned';
        acc.byCategory.set(cat, (acc.byCategory.get(cat) ?? 0) + 1);
        return acc;
      },
      { sumMinor: 0n, count: 0, byCategory: new Map() },
    );
    const avg = totals.count > 0 ? totals.sumMinor / BigInt(totals.count) : 0n;
    let topCategoryId: string | null = null;
    let topCount = 0;
    totals.byCategory.forEach((count, id) => {
      if (count > topCount) {
        topCategoryId = id;
        topCount = count;
      }
    });
    const topCategory =
      topCategoryId === null
        ? null
        : categories.find((c) => c.id === topCategoryId) ?? null;
    return {
      total: list.length,
      active: activeCount,
      inactive: inactiveCount,
      avgPriceMinor: avg.toString(),
      topCategory,
    };
  }, [state, categories]);

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  const selectedInView = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    let count = 0;
    rows.forEach((row) => {
      if (selectedIds.has(row.id)) count += 1;
    });
    return count;
  }, [rows, selectedIds]);

  function toggleSelected(id: string, checked: boolean): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      persistSelected(next);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        rows.forEach((row) => next.add(row.id));
      } else {
        rows.forEach((row) => next.delete(row.id));
      }
      persistSelected(next);
      return next;
    });
  }

  function clearSelection(): void {
    const next = new Set<string>();
    setSelectedIds(next);
    persistSelected(next);
  }

  // -------------------------------------------------------------------------
  // Drawer open / save handlers
  // -------------------------------------------------------------------------

  const loadEditMedia = useCallback(async (productId: string): Promise<void> => {
    setEditMedia((prev) => ({ ...prev, busy: true, flash: null }));
    try {
      const client = createAdminClient();
      const res = await client.request({
        path: `admin/products/${productId}/media`,
        schema: adminMediaListSchema,
      });
      setEditMedia((prev) => ({ ...prev, rows: res.data }));
    } catch (error) {
      setEditMedia((prev) => ({ ...prev, flash: { tone: 'err', text: errorMessage(error) } }));
    } finally {
      setEditMedia((prev) => ({ ...prev, busy: false }));
    }
  }, [setEditMedia]);

  const openEdit = useCallback((row: Product): void => {
    setFlash(null);
    const minor = row.basePriceMinor ?? '0';
    let major = '99,90';
    try {
      const n = Number(minor);
      if (Number.isFinite(n)) {
        const sign = n < 0 ? '-' : '';
        const abs = Math.abs(n);
        const whole = Math.trunc(abs / 100).toString();
        const frac = (abs % 100).toString().padStart(2, '0');
        major = `${sign}${whole},${frac}`;
      }
    } catch {
      /* keep default */
    }
    setEditForm({
      categoryId: row.categoryId ?? '',
      slug: row.slug ?? '',
      name: row.name,
      description: row.description ?? '',
      basePriceMajor: major,
      isActive: row.isActive !== false,
      displayOrder: row.displayOrder?.toString() ?? '0',
    });
    setEditMedia(makeEmptyEditMedia());
    setConfirmDeactivate(false);
    setArchiveAcknowledged(false);
    setModal({ kind: 'edit', productId: row.id, initialActive: row.isActive !== false });
  }, [setEditMedia]);

  // When the edit drawer opens, fetch its media list.
  useEffect(() => {
    if (modal.kind === 'edit') {
      void loadEditMedia(modal.productId);
    }
    // loadEditMedia is stable; excluding it to avoid a circular type dependency
    // with the openEdit callback that defines modal state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const attachEditMedia = useCallback(async (): Promise<void> => {
    if (modal.kind !== 'edit') return;
    const { productId } = modal;
    setEditMedia((prev) => ({ ...prev, busy: true, flash: null }));
    try {
      const client = createAdminClient();
      if (editMedia.file) {
        await uploadProductImage({
          productId,
          file: editMedia.file,
          altText: editMedia.alt.trim() || undefined,
        });
        setEditMedia((prev) => ({
          ...prev,
          file: null,
          flash: { tone: 'ok', text: 'Görsel yüklendi.' },
        }));
      } else if (editMedia.url.trim()) {
        await client.request({
          method: 'POST',
          path: `admin/products/${productId}/media`,
          body: {
            url: editMedia.url.trim(),
            altText: editMedia.alt.trim() || undefined,
            displayOrder: 0,
          },
          schema: adminMediaSchema,
        });
        setEditMedia((prev) => ({
          ...prev,
          url: '',
          flash: { tone: 'ok', text: 'Medya URL eklendi.' },
        }));
      } else {
        setEditMedia((prev) => ({
          ...prev,
          busy: false,
          flash: { tone: 'err', text: 'Görsel dosyası veya URL gerekli.' },
        }));
        return;
      }
      setEditMedia((prev) => ({ ...prev, alt: '' }));
      await loadEditMedia(productId);
    } catch (error) {
      setEditMedia((prev) => ({ ...prev, flash: { tone: 'err', text: errorMessage(error) } }));
    } finally {
      setEditMedia((prev) => ({ ...prev, busy: false }));
    }
  }, [setEditMedia, loadEditMedia, modal, editMedia.alt, editMedia.file, editMedia.url]);

  // -------------------------------------------------------------------------
  // Bulk actions
  // -------------------------------------------------------------------------

  function openBulkDelete(): void {
    const ids = rows.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    setConfirmPermanentDelete(false);
    setModal({ kind: 'delete', productIds: ids });
  }

  async function handleBulkUpdate(isActive: boolean): Promise<void> {
    if (selectedIds.size === 0) return;
    setBusy(true);
    setFlash(null);
    try {
      const admin = createAdminClient();
      const ids = rows.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
      await Promise.all(
        ids.map((id) =>
          admin.request({
            method: 'PATCH',
            path: `admin/products/${id}`,
            body: { isActive },
            schema: envelope(z.unknown()),
          }),
        ),
      );
      setFlash({
        tone: 'ok',
        text: `${ids.length} ürün ${isActive ? 'aktif' : 'arşiv'} yapıldı.`,
      });
      clearSelection();
      await load();
    } catch (error) {
      setFlash({ tone: 'err', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkCategory(categoryId: string): Promise<void> {
    if (!categoryId || selectedIds.size === 0) return;
    setBusy(true);
    setFlash(null);
    try {
      const admin = createAdminClient();
      const ids = rows.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
      await Promise.all(
        ids.map((id) =>
          admin.request({
            method: 'PATCH',
            path: `admin/products/${id}`,
            body: { categoryId },
            schema: envelope(z.unknown()),
          }),
        ),
      );
      setFlash({ tone: 'ok', text: `${ids.length} ürün kategori taşındı.` });
      clearSelection();
      await load();
    } catch (error) {
      setFlash({ tone: 'err', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  // -------------------------------------------------------------------------
  // Save (edit) + create
  // -------------------------------------------------------------------------

  function proceedWithSaveEdit(): void {
    if (modal.kind !== 'edit') return;
    const willArchive = modal.initialActive && !editForm.isActive;
    if (willArchive) {
      if (!confirmDeactivate) {
        setConfirmDeactivate(true);
        setArchiveAcknowledged(false);
        return;
      }
      if (!archiveAcknowledged) return;
    }
    void saveEdit();
  }

  async function saveEdit(): Promise<void> {
    if (modal.kind !== 'edit') return;
    setBusy(true);
    setFlash(null);
    const minor = parseTryMajorToMinor(editForm.basePriceMajor);
    if (!editForm.name.trim()) {
      setFlash({ tone: 'err', text: 'Ad zorunlu.' });
      setBusy(false);
      return;
    }
    if (!editForm.categoryId) {
      setFlash({ tone: 'err', text: 'Kategori seçin.' });
      setBusy(false);
      return;
    }
    if (!Number.isInteger(Number(editForm.displayOrder)) || Number(editForm.displayOrder) < 0) {
      setFlash({ tone: 'err', text: 'Gösterim sırası sıfır veya daha büyük tam sayı olmalı.' });
      setBusy(false);
      return;
    }
    if (!minor && editForm.basePriceMajor.trim().length > 0) {
      setFlash({ tone: 'err', text: 'Fiyat geçersiz.' });
      setBusy(false);
      return;
    }
    const description = editForm.description.trim();
    try {
      const client = createAdminClient();
      await client.request({
        method: 'PATCH',
        path: `admin/products/${modal.productId}`,
        body: {
          categoryId: editForm.categoryId,
          name: editForm.name.trim(),
          description: description === '' ? null : description,
          basePriceMinor: minor ?? undefined,
          isActive: editForm.isActive,
          displayOrder: Number.isFinite(Number(editForm.displayOrder))
            ? Number(editForm.displayOrder)
            : undefined,
        },
        schema: envelope(z.unknown()),
      });
      setFlash({ tone: 'ok', text: 'Ürün güncellendi.' });
      setModal({ kind: 'closed' });
      await load();
    } catch (error) {
      setFlash({ tone: 'err', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function createProduct(): Promise<void> {
    if (!createName.trim() || !createSlug.trim() || !createCategoryId) {
      setFlash({ tone: 'err', text: 'Ad, slug ve kategori zorunlu.' });
      return;
    }
    const minor = parseTryMajorToMinor(createPriceMajor);
    if (!minor) {
      setFlash({ tone: 'err', text: 'Fiyat geçersiz.' });
      return;
    }
    if (!Number.isInteger(Number(createDisplayOrder)) || Number(createDisplayOrder) < 0) {
      setFlash({ tone: 'err', text: 'Gösterim sırası sıfır veya daha büyük tam sayı olmalı.' });
      return;
    }
    setBusy(true);
    setFlash(null);
    try {
      const client = createAdminClient();
      const res = await client.request({
        method: 'POST',
        path: 'admin/products',
        body: {
          categoryId: createCategoryId,
          name: createName.trim(),
          slug: createSlug.trim(),
          description: createDescription.trim() || undefined,
          basePriceMinor: minor,
          currency: 'TRY',
          displayOrder: Number.isFinite(Number(createDisplayOrder))
            ? Math.max(0, Number(createDisplayOrder))
            : 0,
        },
        schema: productCreateSchema,
      });
      setFlash({ tone: 'ok', text: `Ürün oluşturuldu: ${res.data.name ?? createName}` });
      setCreateName('');
      setCreateSlug('');
      setCreateSlugTouched(false);
      setCreateDescription('');
      setCreatePriceMajor('99,90');
      setCreateDisplayOrder('0');
      setModal({ kind: 'closed' });
      await load();
    } catch (error) {
      setFlash({ tone: 'err', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete (single + bulk)
  // -------------------------------------------------------------------------

  async function handleDelete(force: boolean): Promise<void> {
    if (modal.kind !== 'delete') return;
    const ids = modal.productIds;
    setBusy(true);
    setFlash(null);
    try {
      const client = createAdminClient();
      for (const id of ids) {
        await client.request({
          method: 'PATCH',
          path: `admin/products/${id}`,
          body: { isActive: false },
          schema: envelope(z.unknown()),
        });
      }
      if (force) {
        for (const id of ids) {
          await client.request({
            method: 'DELETE',
            path: `admin/products/${id}?force=true`,
            schema: envelope(z.unknown()),
          });
        }
      }
      const verb = force ? 'kalıcı silindi' : 'arşivlendi';
      setFlash({ tone: 'ok', text: `${ids.length} ürün ${verb}.` });
      setModal({ kind: 'closed' });
      clearSelection();
      await load();
    } catch (error) {
      const code = (error as { envelope?: { error?: { code?: string } } })?.envelope?.error?.code;
      setFlash({
        tone: 'err',
        text:
          code === 'VALIDATION_ERROR'
            ? 'Ürün aktif siparişlerde kullanılıyor; kuvvetle silmek için onayı işaretleyin.'
            : errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={`${styles.catalog} ops-page`}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <div className={styles.kicker}>
            <OpsIcon name="fastfood" /> Merkezi katalog
          </div>
          <h1>Ürün kataloğu</h1>
          <p>Ürünleri, fiyatları ve mağaza görünürlüğünü tek noktadan yönetin.</p>
        </div>
        <div className={styles.headingActions}>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => setModal({ kind: 'create' })}
          >
            <OpsIcon name="add" /> Yeni ürün
          </button>
        </div>
      </header>

      <dl className={styles.summary} aria-label="Katalog özeti">
        <div>
          <dt>Toplam ürün</dt>
          <dd>{metrics.total}</dd>
          <small>Katalog kaydı</small>
        </div>
        <div>
          <dt>Yayında</dt>
          <dd className={styles.activeValue}>{metrics.active}</dd>
          <small>Müşteriye açık</small>
        </div>
        <div>
          <dt>Arşiv</dt>
          <dd className={styles.archiveValue}>{metrics.inactive}</dd>
          <small>Yayından gizli</small>
        </div>
        <div>
          <dt>Ortalama fiyat</dt>
          <dd className={styles.averageValue}>
            {metrics.total ? formatTryMinor(metrics.avgPriceMinor, 'TRY') : '—'}
          </dd>
          <small>
            {metrics.topCategory
              ? `Yoğun kategori: ${metrics.topCategory.name}`
              : 'Baz fiyat ortalaması'}
          </small>
        </div>
      </dl>

      <section className={styles.controlBar} aria-label="Ürün arama ve filtreleri">
        <label className={styles.searchBox}>
          <OpsIcon name="search" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ürün adı, slug veya kimlik ara"
            aria-label="Ürün ara"
          />
          {q ? (
            <button type="button" onClick={() => setQ('')} aria-label="Aramayı temizle">
              ×
            </button>
          ) : null}
        </label>
        <label className={styles.filterField}>
          <span>Kategori</span>
          <select
            aria-label="Kategori filtresi"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tüm kategoriler</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Durum</span>
          <select
            aria-label="Aktif filtresi"
            value={active}
            onChange={(e) => setActive(e.target.value as ProductActiveFilter)}
          >
            <option value="">Tüm ürünler</option>
            <option value="active">Yayında</option>
            <option value="inactive">Arşivde</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Sırala</span>
          <select
            aria-label="Sıralama"
            value={sort}
            onChange={(e) => setSort(e.target.value as ProductSort)}
          >
            <option value="order">Gösterim sırası</option>
            <option value="name">Ürün adı</option>
            <option value="price">Fiyat</option>
          </select>
        </label>
      </section>

      {selectedInView > 0 ? (
        <div className={styles.bulkBar} role="region" aria-label="Toplu işlem">
          <div className={styles.bulkCount}>
            <strong>{selectedInView}</strong>
            <span>ürün seçili</span>
          </div>
          <div className={styles.bulkActions}>
            <ActionButton onClick={() => void handleBulkUpdate(true)} disabled={busy}>
              Yayına al
            </ActionButton>
            <ActionButton onClick={() => void handleBulkUpdate(false)} disabled={busy}>
              Arşivle
            </ActionButton>
            <label className={styles.bulkCategory}>
              <span>Kategoriye taşı</span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) void handleBulkCategory(e.target.value);
                }}
                disabled={busy}
                aria-label="Toplu kategori ata"
              >
                <option value="">Kategori seçin</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <ActionButton variant="danger" onClick={openBulkDelete} disabled={busy}>
              Sil
            </ActionButton>
            <ActionButton variant="ghost" onClick={clearSelection} disabled={busy}>
              Seçimi temizle
            </ActionButton>
          </div>
        </div>
      ) : null}

      {flash ? (
        <p
          role="status"
          aria-live="polite"
          className={`${styles.notice} ${flash.tone === 'ok' ? styles.success : styles.error}`}
        >
          {flash.text}
        </p>
      ) : null}

      <AsyncBoundary
        state={state}
        emptyTitle="Henüz ürün eklenmemiş"
        emptyDescription="İlk ürününüzü oluşturarak kataloğu kurmaya başlayın."
        emptyAction={
          <button
            type="button"
            className={styles.createButton}
            onClick={() => setModal({ kind: 'create' })}
          >
            <OpsIcon name="add" /> Yeni ürün
          </button>
        }
        onRetry={() => void load()}
      >
        {() => {
          if (rows.length === 0) {
            return (
              <OpsEmpty
                title="Eşleşen ürün bulunamadı"
                description="Arama sözcüğünü veya filtreleri değiştirin."
              />
            );
          }
          return (
            <ProductsDataGrid
              rows={rows}
              totalCount={state.status === 'ready' ? state.data.length : 0}
              categories={categories}
              selectedIds={selectedIds}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelected={toggleSelected}
              onEdit={(productId) => {
                const product = state.status === 'ready'
                  ? state.data.find((candidate) => candidate.id === productId)
                  : undefined;
                if (product) openEdit(product);
              }}
            />
          );
        }}
      </AsyncBoundary>

      {modal.kind === 'edit' ? (
        <ProductEditExperience
          product={state.status === 'ready'
            ? state.data.find((candidate) => candidate.id === modal.productId)
            : undefined}
          productId={modal.productId}
          categories={categories}
          form={editForm}
          setForm={setEditForm}
          media={editMedia}
          setMedia={setEditMedia}
          confirmDeactivate={confirmDeactivate}
          setConfirmDeactivate={setConfirmDeactivate}
          archiveAcknowledged={archiveAcknowledged}
          setArchiveAcknowledged={setArchiveAcknowledged}
          busy={busy}
          notice={flash}
          onClose={() => setModal({ kind: 'closed' })}
          onSave={() => void proceedWithSaveEdit()}
          onArchive={() => {
            setConfirmPermanentDelete(false);
            setArchiveAcknowledged(false);
            setModal({ kind: 'delete', productIds: [modal.productId] });
          }}
          onAttachMedia={() => void attachEditMedia()}
        />
      ) : modal.kind !== 'closed' ? (
        <ProductDrawer
          modal={modal}
          products={state.status === 'ready' ? state.data : []}
          categories={categories}
          confirmPermanentDelete={confirmPermanentDelete}
          setConfirmPermanentDelete={setConfirmPermanentDelete}
          busy={busy}
          onClose={() => setModal({ kind: 'closed' })}
          onCreate={async () => void createProduct()}
          onDeleteConfirm={(force) => void handleDelete(force)}
          create={{
            name: createName,
            setName: (value) => {
              setCreateName(value);
              if (!createSlugTouched) setCreateSlug(slugFromName(value));
            },
            slug: createSlug,
            setSlug: (value) => {
              setCreateSlugTouched(true);
              setCreateSlug(value);
            },
            setSlugAuto: () => {
              if (!createSlugTouched) setCreateSlug(slugFromName(createName));
            },
            description: createDescription,
            setDescription: setCreateDescription,
            priceMajor: createPriceMajor,
            setPriceMajor: setCreatePriceMajor,
            categoryId: createCategoryId,
            setCategoryId: setCreateCategoryId,
            displayOrder: createDisplayOrder,
            setDisplayOrder: setCreateDisplayOrder,
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product edit workspace (backend-supported fields only)
// ---------------------------------------------------------------------------

function ProductEditExperience(props: {
  product?: Product;
  productId: string;
  categories: Category[];
  form: EditFormState;
  setForm: (updater: (prev: EditFormState) => EditFormState) => void;
  media: EditMediaState;
  setMedia: (updater: (prev: EditMediaState) => EditMediaState) => void;
  confirmDeactivate: boolean;
  setConfirmDeactivate: (value: boolean) => void;
  archiveAcknowledged: boolean;
  setArchiveAcknowledged: (value: boolean) => void;
  busy: boolean;
  notice: { tone: 'ok' | 'err'; text: string } | null;
  onClose: () => void;
  onSave: () => void;
  onArchive: () => void;
  onAttachMedia: () => void;
}): ReactElement {
  const [section, setSection] = useState<'details' | 'media'>('details');
  const productName = props.form.name.trim() || props.product?.name || 'Yeni ürün';
  const categoryName =
    props.categories.find((category) => category.id === props.form.categoryId)?.name ??
    'Kategori atanmamış';
  const featuredMedia = props.media.rows[0];
  const currentPrice = parseTryMajorToMinor(props.form.basePriceMajor);
  const originalPrice = props.product?.basePriceMinor ?? '';
  const priceDirty = currentPrice === null
    ? props.form.basePriceMajor.trim() !== '' || originalPrice !== ''
    : currentPrice !== originalPrice;
  const isDirty = props.product
    ? props.form.name !== props.product.name ||
      props.form.description !== (props.product.description ?? '') ||
      props.form.categoryId !== props.product.categoryId ||
      props.form.displayOrder !== String(props.product.displayOrder ?? 0) ||
      props.form.isActive !== (props.product.isActive !== false) ||
      priceDirty
    : false;
  const hasPendingMedia = Boolean(props.media.file || props.media.url.trim());

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !props.busy) props.onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [props.busy, props.onClose]);

  const updateField = <Key extends keyof EditFormState>(key: Key, value: EditFormState[Key]) => {
    props.setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className={styles.editorOverlay}>
      <button
        type="button"
        className={styles.editorBackdrop}
        aria-label="Düzenlemeyi kapat"
        onClick={props.onClose}
        disabled={props.busy}
      />
      <section
        className={styles.editorWindow}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
      >
        <header className={styles.editorHeader}>
          <div className={styles.editorBrand}>
            <span className={styles.editorBrandIcon}><OpsIcon name="fastfood" /></span>
            <span>Katalog <i>/</i> Ürün kartı</span>
          </div>
          <div className={styles.editorHeaderActions}>
            <code>{props.productId}</code>
            <button
              type="button"
              className={styles.editorClose}
              aria-label="Düzenlemeyi kapat"
              onClick={props.onClose}
              disabled={props.busy}
            >
              <OpsIcon name="close" />
            </button>
          </div>
        </header>

        <div className={styles.editorTitlebar}>
          <div className={styles.editorTitleCopy}>
            <span className={styles.editorEyebrow}>ÜRÜN YÖNETİMİ <i /> DÜZENLEME</span>
            <h2 id="product-editor-title">{productName}</h2>
            <p>Ürün kartı, fiyatlandırma ve mağaza görünürlüğü</p>
          </div>
          <span className={`${styles.editorStatus} ${props.form.isActive ? styles.editorStatusLive : styles.editorStatusPaused}`}>
            <i /> {props.form.isActive ? 'Mağazada yayında' : 'Arşivde'}
          </span>
        </div>

        <div className={styles.editorWorkspace}>
          <aside className={styles.editorRail}>
            <span className={styles.editorRailCaption}>ÜRÜN KARTI</span>
            <div className={styles.editorRailIdentity}>
              <span><OpsIcon name="fastfood" /></span>
              <div>
                <strong>{productName}</strong>
                <small>{categoryName}</small>
              </div>
            </div>
            <nav className={styles.editorNav} aria-label="Ürün düzenleme bölümleri" role="tablist" aria-orientation="vertical">
              <button
                type="button"
                role="tab"
                aria-selected={section === 'details'}
                className={section === 'details' ? styles.editorNavActive : undefined}
                disabled={props.busy}
                onClick={() => setSection('details')}
              >
                <OpsIcon name="inventory_2" />
                <span><strong>Ürün bilgileri</strong><small>Kimlik, fiyat ve yayın</small></span>
                <i>01</i>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={section === 'media'}
                className={section === 'media' ? styles.editorNavActive : undefined}
                disabled={props.busy}
                onClick={() => setSection('media')}
              >
                <OpsIcon name="image" />
                <span><strong>Ürün görselleri</strong><small>Yükle veya bağlantı ekle</small></span>
                <i>{String(props.media.rows.length).padStart(2, '0')}</i>
              </button>
            </nav>

            <div className={styles.editorRailNote}>
              <OpsIcon name="info" />
              <p>Bu kart, katalog API’sinin sunduğu kategori, ürün içeriği, baz fiyat, sıralama, yayın durumu ve ürün görsellerini yönetir.</p>
            </div>
          </aside>

          <div className={styles.editorMain}>
            {props.notice ? (
              <p className={`${styles.editorNotice} ${props.notice.tone === 'ok' ? styles.editorNoticeSuccess : styles.editorNoticeError}`} role="status">
                {props.notice.text}
              </p>
            ) : null}
            {props.confirmDeactivate && !props.form.isActive ? (
              <div className={styles.editorWarning} role="alert">
                <OpsIcon name="warning" />
                <div>
                  <strong>Ürün mağaza görünümünden kaldırılacak.</strong>
                  <label>
                    <input
                      type="checkbox"
                      checked={props.archiveAcknowledged}
                      onChange={(event) => props.setArchiveAcknowledged(event.target.checked)}
                    />
                    <span>Ürünü arşive alma işlemini onaylıyorum</span>
                  </label>
                </div>
              </div>
            ) : null}

            {section === 'details' ? (
              <div className={styles.editorDetailsGrid} role="tabpanel">
                <div className={styles.editorFormColumn}>
                  <section className={styles.editorCard}>
                    <div className={styles.editorSectionHeading}>
                      <span>01</span>
                      <div><h3>Ürün bilgileri</h3><p>Müşterinin göreceği katalog içeriği</p></div>
                    </div>
                    <div className={styles.editorFields}>
                      <label className={`${styles.editorField} ${styles.fieldWide}`}>
                        <span>Ürün adı <i>*</i></span>
                        <input
                          autoFocus
                          value={props.form.name}
                          maxLength={128}
                          disabled={props.busy}
                          onChange={(event) => updateField('name', event.target.value)}
                          placeholder="Örn. Double Smash Burger"
                        />
                        <small>{props.form.name.length}/128 karakter</small>
                      </label>
                      <label className={styles.editorField}>
                        <span>Kategori <i>*</i></span>
                        <select value={props.form.categoryId} disabled={props.busy} onChange={(event) => updateField('categoryId', event.target.value)}>
                          <option value="" disabled>Kategori seçin</option>
                          {props.categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.editorField}>
                        <span>Ürün adresi</span>
                        <code className={styles.editorReadonly}>{props.form.slug || '—'}</code>
                        <small>Ürün bağlantı anahtarı API tarafından düzenlenemez.</small>
                      </label>
                      <label className={`${styles.editorField} ${styles.fieldWide}`}>
                        <span>Açıklama</span>
                        <textarea
                          value={props.form.description}
                          maxLength={2048}
                          rows={4}
                          disabled={props.busy}
                          onChange={(event) => updateField('description', event.target.value)}
                          placeholder="Ürünün içeriğini ve öne çıkan özelliklerini açıklayın."
                        />
                        <small>{props.form.description.length}/2048 karakter</small>
                      </label>
                    </div>
                  </section>

                  <section className={styles.editorCard}>
                    <div className={styles.editorSectionHeading}>
                      <span>02</span>
                      <div><h3>Ticari bilgiler</h3><p>Fiyat ve katalog içindeki konumu</p></div>
                    </div>
                    <div className={styles.editorFields}>
                      <label className={styles.editorField}>
                        <span>Baz fiyat</span>
                        <div className={styles.editorMoneyField}>
                          <b>₺</b>
                          <input
                            value={props.form.basePriceMajor}
                            inputMode="decimal"
                            disabled={props.busy}
                            onChange={(event) => updateField('basePriceMajor', event.target.value)}
                            placeholder="0,00"
                          />
                          <small>TRY</small>
                        </div>
                      </label>
                      <label className={styles.editorField}>
                        <span>Gösterim sırası</span>
                        <input
                          value={props.form.displayOrder}
                          inputMode="numeric"
                          disabled={props.busy}
                          onChange={(event) => updateField('displayOrder', event.target.value)}
                          placeholder="0"
                        />
                        <small>Küçük değer önce gösterilir.</small>
                      </label>
                    </div>
                  </section>
                </div>

                <aside className={styles.editorPreview}>
                  <span className={styles.editorPreviewLabel}>MAĞAZA ÖNİZLEMESİ</span>
                  <div className={styles.editorPreviewCard}>
                    <div className={styles.editorPreviewImage}>
                      {featuredMedia?.url ? <img src={featuredMedia.url} alt={featuredMedia.altText?.trim() || productName} /> : <OpsIcon name="fastfood" />}
                    </div>
                    <span className={styles.editorPreviewCategory}>{categoryName}</span>
                    <h3>{productName}</h3>
                    <p>{props.form.description.trim() || 'Ürün açıklaması burada görüntülenir.'}</p>
                    <div className={styles.editorPreviewPrice}>
                      <strong>{currentPrice !== null ? formatTryMinor(currentPrice, 'TRY') : 'Fiyat girin'}</strong>
                      <span>baz fiyat</span>
                    </div>
                  </div>
                  <div className={styles.editorRecordFacts}>
                    <span><i>ÜRÜN KİMLİĞİ</i><code>{props.productId.slice(0, 8)}…</code></span>
                    <span><i>GÖSTERİM SIRASI</i><code>{String(props.form.displayOrder || '0').padStart(2, '0')}</code></span>
                    <span><i>GÖRSEL SAYISI</i><code>{props.media.rows.length}</code></span>
                  </div>
                  <div className={styles.editorVisibility}>
                    <div>
                      <span>Yayın kontrolü</span>
                      <strong>{props.form.isActive ? 'Mağazada görünür' : 'Mağazada gizli'}</strong>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={props.form.isActive}
                      aria-label="Ürün yayın durumunu değiştir"
                      className={`${styles.editorSwitch} ${props.form.isActive ? styles.editorSwitchOn : ''}`}
                      disabled={props.busy}
                      onClick={() => {
                        const nextActive = !props.form.isActive;
                        updateField('isActive', nextActive);
                        props.setConfirmDeactivate(false);
                        props.setArchiveAcknowledged(false);
                      }}
                    >
                      <i />
                    </button>
                    <p>{props.form.isActive ? 'Müşteriler bu ürünü görüntüleyebilir.' : 'Yayınladığınızda ürün tekrar mağazada gösterilir.'}</p>
                  </div>
                </aside>
              </div>
            ) : (
              <ProductMediaWorkspace media={props.media} setMedia={props.setMedia} onAttach={props.onAttachMedia} />
            )}
          </div>
        </div>

        <footer className={styles.editorFooter}>
          <div className={styles.editorFooterLeading}>
            <button type="button" className={styles.editorArchive} onClick={props.onArchive} disabled={props.busy}>
              <OpsIcon name="archive" /> Ürünü arşivle
            </button>
            <span className={isDirty || hasPendingMedia ? styles.editorUnsaved : styles.editorSaved}>
              <i /> {isDirty ? 'Kaydedilmemiş ürün bilgileri' : hasPendingMedia ? 'Eklenmeyi bekleyen görsel' : 'Tüm değişiklikler kaydedildi'}
            </span>
          </div>
          <div className={styles.editorFooterActions}>
            <button type="button" className={styles.editorCancel} onClick={props.onClose} disabled={props.busy}>Vazgeç</button>
            <button type="button" className={styles.editorSave} onClick={props.onSave} disabled={props.busy}>
              {props.busy ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
              {!props.busy ? <OpsIcon name="arrow_forward" /> : null}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function ProductMediaWorkspace(props: {
  media: EditMediaState;
  setMedia: (updater: (prev: EditMediaState) => EditMediaState) => void;
  onAttach: () => void;
}): ReactElement {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!props.media.file && fileInputRef.current) fileInputRef.current.value = '';
  }, [props.media.file]);

  return (
    <section className={styles.mediaWorkspace} role="tabpanel">
      <header className={styles.mediaHeading}>
        <div>
          <span className={styles.editorEyebrow}>KATALOG VARLIKLARI</span>
          <h3>Ürün görselleri</h3>
          <p>Ürün kartıyla ilişkili görselleri yönetin. Dosya yükleyin veya mevcut bir görsel adresi ekleyin.</p>
        </div>
        <span className={styles.mediaCount}><OpsIcon name="image" /> {props.media.rows.length} görsel</span>
      </header>

      {props.media.flash ? (
        <p className={`${styles.editorNotice} ${props.media.flash.tone === 'ok' ? styles.editorNoticeSuccess : styles.editorNoticeError}`} role="status">
          {props.media.flash.text}
        </p>
      ) : null}

      {props.media.rows.length > 0 ? (
        <div className={styles.mediaGallery}>
          {props.media.rows.map((row, index) => (
            <article key={row.id} className={styles.mediaCard}>
              <div className={styles.mediaImageFrame}>
                {row.url ? <img src={row.url} alt={row.altText?.trim() || 'Ürün görseli'} /> : <OpsIcon name="image" />}
                <span>{String((row.displayOrder ?? index) + 1).padStart(2, '0')}</span>
              </div>
              <div className={styles.mediaCardCaption}>
                <strong>{row.altText || `Ürün görseli ${index + 1}`}</strong>
                <small>{row.altText ? 'Alternatif metin tanımlı' : 'Alternatif metin eklenmemiş'}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.mediaEmpty}>
          <span><OpsIcon name="image" /></span>
          <strong>Bu ürün için henüz görsel yok</strong>
          <p>Bir görsel ekleyerek mağaza önizlemesini zenginleştirin.</p>
        </div>
      )}

      <section className={styles.mediaAddCard}>
        <div className={styles.editorSectionHeading}>
          <span><OpsIcon name="add" /></span>
          <div><h3>Görsel ekle</h3><p>JPEG, PNG, WebP veya GIF · en fazla 10 MB</p></div>
        </div>
        <div className={styles.mediaAddFields}>
          <label className={styles.editorField}>
            <span>Görsel dosyası</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={props.media.busy}
              onChange={(event) => props.setMedia((current) => ({ ...current, file: event.target.files?.[0] ?? null, url: '' }))}
            />
            {props.media.file ? (
              <small className={styles.selectedFile}>
                {props.media.file.name}
                <button type="button" onClick={() => props.setMedia((current) => ({ ...current, file: null }))} disabled={props.media.busy}>Seçimi kaldır</button>
              </small>
            ) : <small>Dosyanızı seçin veya görsel URL’si kullanın.</small>}
          </label>
          <label className={styles.editorField}>
            <span>Görsel URL’si</span>
            <input
              type="url"
              value={props.media.url}
              disabled={props.media.busy || Boolean(props.media.file)}
              onChange={(event) => props.setMedia((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://..."
            />
            <small>Güvenli bir görsel adresi girin.</small>
          </label>
          <label className={styles.editorField}>
            <span>Alternatif metin <i>opsiyonel</i></span>
            <input
              value={props.media.alt}
              maxLength={255}
              disabled={props.media.busy}
              onChange={(event) => props.setMedia((current) => ({ ...current, alt: event.target.value }))}
              placeholder="Örn. Double Smash Burger"
            />
            <small>Ekran okuyucular için kısa görsel açıklaması.</small>
          </label>
        </div>
        <div className={styles.mediaAddFooter}>
          <span>Görseller ürün kaydına bağlı olarak saklanır.</span>
          <button
            type="button"
            className={styles.editorSave}
            disabled={props.media.busy || (!props.media.file && !props.media.url.trim())}
            onClick={props.onAttach}
          >
            {props.media.busy ? 'Yükleniyor…' : 'Görseli ekle'}
            {!props.media.busy ? <OpsIcon name="arrow_forward" /> : null}
          </button>
        </div>
      </section>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Create and delete dialogs
// ---------------------------------------------------------------------------

function ProductDrawer(props: {
  modal: Extract<ModalState, { kind: 'create' | 'delete' }>;
  products: Product[];
  categories: Category[];
  confirmPermanentDelete: boolean;
  setConfirmPermanentDelete: (value: boolean) => void;
  busy: boolean;
  create: {
    name: string;
    setName: (value: string) => void;
    slug: string;
    setSlug: (value: string) => void;
    setSlugAuto: () => void;
    description: string;
    setDescription: (value: string) => void;
    priceMajor: string;
    setPriceMajor: (value: string) => void;
    categoryId: string;
    setCategoryId: (value: string) => void;
    displayOrder: string;
    setDisplayOrder: (value: string) => void;
  };
  onClose: () => void;
  onCreate: () => Promise<void>;
  onDeleteConfirm: (force: boolean) => void;
}): ReactElement {
  const { modal } = props;
  const eyebrow = modal.kind === 'create' ? 'KATALOG · YENİ KAYIT' : 'KATALOG · SİLME ONAYI';
  const title = modal.kind === 'create' ? 'Yeni Ürün' : 'Silmeyi Onayla';

  return (
    <div className="ops-drawer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="ops-drawer__scrim"
        aria-label="Kapat"
        onClick={props.onClose}
      />
      <div className="ops-drawer__panel">
        <header className="ops-drawer__head">
          <div className="ops-drawer__head-meta">
            <span className="ops-drawer__eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="ops-drawer__close"
            onClick={props.onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </header>

        {modal.kind === 'create' ? (
          <div className="ops-drawer__body">
            <CreateForm categories={props.categories} create={props.create} />
          </div>
        ) : null}

        {modal.kind === 'delete' ? (
          <div className="ops-drawer__body">
            <div className="ops-drawer__section">
              <div className="ops-drawer__section-head">
                <span>Sipariş Etkisi</span>
              </div>
              <p className="ops-page__lede" style={{ margin: 0 }}>
                <strong>{modal.productIds.length}</strong> ürünü arşivleyebilir veya ilişkili katalog kayıtlarıyla birlikte kalıcı olarak silebilirsiniz. Sipariş geçmişiyle ilişkili ürünler için API ek onay ister.
              </p>
            </div>
            <div className="ops-drawer__section">
              <div className="ops-drawer__section-head">
                <span>Etkilenen Ürünler</span>
              </div>
              <ul className="ops-delete-summary">
                {modal.productIds.map((id) => (
                  <li key={id}>
                    <strong>{props.products.find((product) => product.id === id)?.name ?? 'Ürün bulunamadı'}</strong>
                    <code>{id}</code>
                  </li>
                ))}
              </ul>
            </div>
            <label className="ops-checkbox-row">
              <input
                type="checkbox"
                checked={props.confirmPermanentDelete}
                onChange={(event) => props.setConfirmPermanentDelete(event.target.checked)}
              />
              <span>Kalıcı silmenin geri alınamayacağını anlıyorum.</span>
            </label>
          </div>
        ) : null}

        <footer className="ops-drawer__foot">
          <div className="ops-drawer__foot-helper">
            {modal.kind === 'create'
              ? 'Yeni ürün onay sonrası katalogda görünür.'
              : 'Arşiv geri alınabilir; kuvvetle silme kalıcıdır.'}
          </div>
          <div className="ops-drawer__foot-actions">
            {modal.kind === 'create' ? (
              <>
                <ActionButton variant="ghost" onClick={props.onClose} disabled={props.busy}>
                  Vazgeç
                </ActionButton>
                <ActionButton variant="primary" onClick={props.onCreate} disabled={props.busy}>
                  {props.busy ? 'Oluşturuluyor…' : 'Ürünü Oluştur'}
                </ActionButton>
              </>
            ) : null}
            {modal.kind === 'delete' ? (
              <>
                <ActionButton variant="ghost" onClick={props.onClose} disabled={props.busy}>
                  Vazgeç
                </ActionButton>
                <ActionButton
                  variant="danger"
                  onClick={() => props.onDeleteConfirm(false)}
                  disabled={props.busy}
                >
                  {props.busy ? 'Arşivleniyor…' : 'Yalnızca Arşivle'}
                </ActionButton>
                <ActionButton
                  variant="danger"
                  onClick={() => props.onDeleteConfirm(true)}
                  disabled={props.busy || !props.confirmPermanentDelete}
                >
                  Kuvvetle Sil
                </ActionButton>
              </>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

function CreateForm(props: {
  categories: Category[];
  create: {
    name: string;
    setName: (value: string) => void;
    slug: string;
    setSlug: (value: string) => void;
    setSlugAuto: () => void;
    description: string;
    setDescription: (value: string) => void;
    priceMajor: string;
    setPriceMajor: (value: string) => void;
    categoryId: string;
    setCategoryId: (value: string) => void;
    displayOrder: string;
    setDisplayOrder: (value: string) => void;
  };
}): ReactElement {
  const c = props.create;
  return (
    <div className="ops-drawer__form">
      <div className="ops-drawer__section">
        <div className="ops-drawer__section-head">
          <span>Kimlik</span>
        </div>
        <label className="ops-field">
          <span>Ürün adı</span>
          <input
            className="ops-input"
            value={c.name}
            required
            aria-required="true"
            onChange={(e) => c.setName(e.target.value)}
            placeholder="örn. Smas Burger"
          />
        </label>
        <label className="ops-field">
          <span>Slug</span>
          <input
            className="ops-input"
            value={c.slug}
            required
            aria-required="true"
            onChange={(e) => c.setSlug(e.target.value)}
            onBlur={c.setSlugAuto}
            placeholder="örn. smas-burger"
          />
        </label>
        <label className="ops-field">
          <span>Açıklama</span>
          <textarea
            className="ops-textarea"
            rows={3}
            value={c.description}
            onChange={(e) => c.setDescription(e.target.value)}
            placeholder="Ürünün müşteriye görünen kısa açıklaması"
          />
        </label>
      </div>
      <div className="ops-drawer__section">
        <div className="ops-drawer__section-head">
          <span>Sınıflandırma</span>
        </div>
        <label className="ops-field">
          <span>Kategori</span>
          <select
            className="ops-select"
            aria-label="Yeni ürün kategorisi"
            value={c.categoryId}
            onChange={(e) => c.setCategoryId(e.target.value)}
          >
            {props.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ops-drawer__section">
        <div className="ops-drawer__section-head">
          <span>Fiyatlandırma</span>
        </div>
        <div className="ops-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ops-space-sm)' }}>
          <label className="ops-drawer__price">
            <span>Baz Fiyat</span>
            <span className="ops-drawer__price-prefix" aria-hidden="true">₺</span>
            <input
              className="ops-input"
              value={c.priceMajor}
              inputMode="decimal"
              aria-label="Fiyat TRY"
              onChange={(e) => c.setPriceMajor(e.target.value)}
              placeholder="99,90"
            />
          </label>
          <label className="ops-field">
            <span>Gösterim sırası</span>
            <input
              className="ops-input"
              value={c.displayOrder}
              inputMode="numeric"
              onChange={(e) => c.setDisplayOrder(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
