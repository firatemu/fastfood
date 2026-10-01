'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { createAdminClient } from '../../../lib/api';
import {
  adminAllergensSchema,
  adminProductsSchema,
  allergenCreateSchema,
  allergenDeleteSchema,
  allergenProductLinkSchema,
} from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './allergens.module.css';

type Allergen = z.infer<typeof adminAllergensSchema>['data'][number];
type Product = z.infer<typeof adminProductsSchema>['data'][number];
type DialogState = { kind: 'create' } | { kind: 'edit'; id: string } | null;
type LinkFilter = 'all' | 'linked' | 'unlinked';

const EMPTY_ALLERGENS: Allergen[] = [];
const PAGE_SIZES = [10, 20, 50];

export default function AllergensPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Allergen[]>>({ status: 'loading' });
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LinkFilter>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [tab, setTab] = useState<'details' | 'products'>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const client = createAdminClient();
      const [allergensResult, productsResult] = await Promise.allSettled([
        client.request({ path: 'admin/allergens', schema: adminAllergensSchema }),
        client.request({ path: 'admin/products', schema: adminProductsSchema }),
      ]);
      if (allergensResult.status === 'rejected') throw allergensResult.reason;
      setState(
        allergensResult.value.data.length
          ? { status: 'ready', data: allergensResult.value.data }
          : { status: 'empty' },
      );
      setProducts(productsResult.status === 'fulfilled' ? productsResult.value.data : null);
      if (productsResult.status === 'fulfilled') markSynced();
      else markStale();
    } catch (cause) {
      setState({ status: 'error', error: cause });
      markStale();
      throw cause;
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => void load().catch(() => undefined));
    return () => registerRefresh(null);
  }, [load, registerRefresh]);
  useDeferredLoad(() => void load().catch(() => undefined), [load]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (dialog && !node.open) node.showModal();
    if (!dialog && node.open) node.close();
  }, [dialog]);

  useEffect(() => {
    if (!columnsOpen) return;
    const close = (event: MouseEvent) => {
      if (!columnMenuRef.current?.contains(event.target as Node)) setColumnsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnsOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [columnsOpen]);

  const allAllergens = state.status === 'ready' ? state.data : EMPTY_ALLERGENS;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return allAllergens.filter((allergen) => {
      if (filter === 'linked' && !allergen.products.length) return false;
      if (filter === 'unlinked' && allergen.products.length) return false;
      return (
        !needle ||
        [allergen.name, allergen.description, ...allergen.products.map((product) => product.name)]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase('tr-TR').includes(needle))
      );
    });
  }, [allAllergens, filter, query]);

  const openEdit = useCallback((allergen: Allergen, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setName(allergen.name);
    setDescription(allergen.description ?? '');
    setProductQuery('');
    setFormError(null);
    setConfirmDelete(false);
    setTab('details');
    setDialog({ kind: 'edit', id: allergen.id });
  }, []);

  const columns = useMemo<ColumnDef<Allergen>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: 'Alerjen',
        enableHiding: false,
        cell: ({ row }) => (
          <div className={styles.identity}>
            <span className={styles.identityIcon} aria-hidden="true">
              !
            </span>
            <strong>{row.original.name}</strong>
          </div>
        ),
      },
      {
        id: 'description',
        accessorFn: (row) => row.description ?? '',
        header: 'Açıklama',
        cell: ({ row }) => (
          <span className={row.original.description ? styles.description : styles.muted}>
            {row.original.description || 'Açıklama eklenmedi'}
          </span>
        ),
      },
      {
        id: 'products',
        accessorFn: (row) => row.products.length,
        header: 'Bağlı ürünler',
        cell: ({ row }) => (
          <div className={styles.productCell}>
            <span className={row.original.products.length ? styles.count : styles.countEmpty}>
              {row.original.products.length}
            </span>
            <span className={styles.productPreview}>
              {row.original.products.length
                ? row.original.products
                    .slice(0, 2)
                    .map((product) => product.name)
                    .join(', ') +
                  (row.original.products.length > 2
                    ? ' +' + (row.original.products.length - 2)
                    : '')
                : 'Ürün bağlanmadı'}
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'İşlem',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.rowAction}
            onClick={(event) => openEdit(row.original, event.currentTarget)}
            aria-label={row.original.name + ' alerjenini düzenle'}
          >
            Düzenle <span aria-hidden="true">↗</span>
          </button>
        ),
      },
    ],
    [openEdit],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination, columnVisibility: visibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selected =
    dialog?.kind === 'edit' ? allAllergens.find((item) => item.id === dialog.id) : null;
  const linkedProductIds = new Set(selected?.products.map((product) => product.id) ?? []);
  const visibleProducts = (products ?? [])
    .filter((product) =>
      product.name
        .toLocaleLowerCase('tr-TR')
        .includes(productQuery.trim().toLocaleLowerCase('tr-TR')),
    )
    .sort(
      (a, b) =>
        Number(linkedProductIds.has(b.id)) - Number(linkedProductIds.has(a.id)) ||
        a.name.localeCompare(b.name, 'tr'),
    );

  function closeDialog() {
    if (busy || busyProductId) return;
    dialogRef.current?.close();
    setDialog(null);
    setConfirmDelete(false);
    setFormError(null);
    triggerRef.current?.focus();
  }

  function openCreate(trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setName('');
    setDescription('');
    setProductQuery('');
    setFormError(null);
    setConfirmDelete(false);
    setTab('details');
    setDialog({ kind: 'create' });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Alerjen adı zorunludur.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const client = createAdminClient();
      if (dialog?.kind === 'edit') {
        await client.request({
          method: 'PATCH',
          path: 'admin/allergens/' + dialog.id,
          body: { name: name.trim(), description: description.trim() || null },
          schema: allergenCreateSchema,
        });
        await load();
        setNotice('Alerjen bilgileri güncellendi.');
        setDialog(null);
        dialogRef.current?.close();
        triggerRef.current?.focus();
      } else {
        const result = await client.request({
          method: 'POST',
          path: 'admin/allergens',
          body: { name: name.trim(), description: description.trim() || undefined },
          schema: allergenCreateSchema,
        });
        await load();
        setNotice('Alerjen oluşturuldu. Şimdi ürün bağlantılarını düzenleyebilirsiniz.');
        setDialog({ kind: 'edit', id: result.data.id });
        setTab('products');
      }
    } catch (cause) {
      setFormError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(productId: string, linked: boolean) {
    if (!selected) return;
    setBusyProductId(productId);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: linked ? 'DELETE' : 'POST',
        path: 'admin/allergens/' + selected.id + '/products/' + productId,
        schema: allergenProductLinkSchema,
      });
      await load();
      setNotice(linked ? 'Ürün bağlantısı kaldırıldı.' : 'Alerjen ürüne bağlandı.');
    } catch (cause) {
      setFormError(errorMessage(cause));
    } finally {
      setBusyProductId(null);
    }
  }

  async function remove() {
    if (!selected || selected.products.length) return;
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'DELETE',
        path: 'admin/allergens/' + selected.id,
        schema: allergenDeleteSchema,
      });
      setDialog(null);
      dialogRef.current?.close();
      setNotice('Alerjen silindi.');
      await load();
      triggerRef.current?.focus();
    } catch (cause) {
      setFormError(errorMessage(cause));
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            Katalog <span>/</span> Alerjenler
          </div>
          <h1>Alerjenler</h1>
          <p>Ürünlerde gösterilen alerjen bilgilerini ve bağlantılarını yönetin.</p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={(event) => openCreate(event.currentTarget)}
        >
          <span aria-hidden="true">＋</span> Yeni alerjen
        </button>
      </header>

      {notice && (
        <div className={styles.notice} role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Bildirimi kapat">
            ×
          </button>
        </div>
      )}

      <section className={styles.panel} aria-label="Alerjen kayıtları">
        <div className={styles.panelHeader}>
          <div>
            <h2>Alerjen listesi</h2>
            <p>Ürün bağlantıları burada yapılan değişikliklere göre güncellenir.</p>
          </div>
          <div className={styles.tools}>
            <label className={styles.search}>
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder="Alerjen veya ürün ara"
                aria-label="Alerjen ara"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle">
                  ×
                </button>
              )}
            </label>
            <div className={styles.columnMenu} ref={columnMenuRef}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setColumnsOpen((value) => !value)}
                aria-expanded={columnsOpen}
              >
                Sütunlar ▾
              </button>
              {columnsOpen && (
                <div className={styles.columnMenuPanel} role="group" aria-label="Görünür sütunlar">
                  {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <label key={column.id}>
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                        />
                        {String(column.columnDef.header)}
                      </label>
                    ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void load().catch(() => undefined)}
            >
              Yenile
            </button>
          </div>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.segmented} aria-label="Ürün bağlantısı filtresi">
            {(
              [
                ['all', 'Tümü'],
                ['linked', 'Ürüne bağlı'],
                ['unlinked', 'Bağlantısız'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? styles.filterActive : styles.filterButton}
                onClick={() => {
                  setFilter(value);
                  table.setPageIndex(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span className={styles.resultCount}>{filtered.length} alerjen</span>
        </div>

        {state.status === 'loading' && (
          <div className={styles.statePanel}>Alerjenler yükleniyor…</div>
        )}
        {state.status === 'error' && (
          <div className={styles.statePanel}>
            <strong>Alerjenler yüklenemedi</strong>
            <span>{errorMessage(state.error)}</span>
            <button type="button" onClick={() => void load().catch(() => undefined)}>
              Tekrar dene
            </button>
          </div>
        )}
        {(state.status === 'ready' || state.status === 'empty') && (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table} aria-label="Alerjen veri tablosu">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th key={header.id}>
                          <button
                            type="button"
                            className={styles.sortButton}
                            disabled={!header.column.getCanSort()}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span aria-hidden="true">
                                {header.column.getIsSorted() === 'asc'
                                  ? '↑'
                                  : header.column.getIsSorted() === 'desc'
                                    ? '↓'
                                    : '↕'}
                              </span>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <div className={styles.statePanel}>
                  <strong>
                    {state.status === 'empty' ? 'Henüz alerjen yok' : 'Eşleşen alerjen yok'}
                  </strong>
                  <span>
                    {state.status === 'empty'
                      ? 'İlk alerjeni ekleyerek başlayın.'
                      : 'Aramayı veya bağlantı filtresini değiştirin.'}
                  </span>
                </div>
              )}
            </div>
            <footer className={styles.footer}>
              <span>
                Gösterilen {table.getRowModel().rows.length} / {filtered.length} kayıt
              </span>
              <div>
                <label>
                  Sayfa başına{' '}
                  <select
                    value={pagination.pageSize}
                    onChange={(event) => table.setPageSize(Number(event.target.value))}
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  aria-label="Önceki sayfa"
                >
                  ‹
                </button>
                <span>
                  {pagination.pageIndex + 1} / {table.getPageCount() || 1}
                </span>
                <button
                  type="button"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  aria-label="Sonraki sayfa"
                >
                  ›
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        onClose={() => {
          setDialog(null);
          setConfirmDelete(false);
          triggerRef.current?.focus();
        }}
        onCancel={(event) => {
          if (busy || busyProductId) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        aria-labelledby="allergen-dialog-title"
      >
        {dialog && (
          <>
            <div className={styles.dialogHeader}>
              <div>
                <span className={styles.dialogOverline}>Katalog / Alerjenler</span>
                <h2 id="allergen-dialog-title">
                  {dialog.kind === 'create'
                    ? 'Yeni alerjen'
                    : (selected?.name ?? 'Alerjeni düzenle')}
                </h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeDialog}
                aria-label="Pencereyi kapat"
              >
                ×
              </button>
            </div>
            {dialog.kind === 'edit' && (
              <div
                className={styles.dialogTabs}
                role="tablist"
                aria-label="Alerjen düzenleme bölümleri"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'details'}
                  className={tab === 'details' ? styles.tabActive : styles.tab}
                  onClick={() => {
                    setTab('details');
                    setFormError(null);
                  }}
                >
                  Bilgiler
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'products'}
                  className={tab === 'products' ? styles.tabActive : styles.tab}
                  onClick={() => {
                    setTab('products');
                    setFormError(null);
                  }}
                >
                  Bağlı ürünler <span>{selected?.products.length ?? 0}</span>
                </button>
              </div>
            )}
            {(dialog.kind === 'create' || tab === 'details') && (
              <form onSubmit={(event) => void save(event)}>
                <div className={styles.dialogBody}>
                  <p className={styles.formIntro}>
                    Alerjen adı müşterilere gösterilir. Açıklama, ekip için içerik bilgisini
                    netleştirir.
                  </p>
                  <label className={styles.field}>
                    Alerjen adı <span>*</span>
                    <input
                      value={name}
                      maxLength={128}
                      required
                      autoFocus
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Örneğin: Susam"
                    />
                  </label>
                  <label className={styles.field}>
                    Açıklama <small>İsteğe bağlı</small>
                    <textarea
                      value={description}
                      maxLength={512}
                      rows={4}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Ürün içeriğiyle ilgili kısa bilgi"
                    />
                  </label>
                  <p className={styles.fieldHint}>
                    Alerjen kodu sistem tarafından otomatik atanır.
                  </p>
                  {dialog.kind === 'edit' && (
                    <div className={styles.deleteArea}>
                      <div>
                        <strong>Alerjeni sil</strong>
                        <span>
                          {selected?.products.length
                            ? 'Önce bağlı ürünleri kaldırın.'
                            : 'Silme işlemi geri alınamaz.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(selected?.products.length) || busy}
                        onClick={() => setConfirmDelete(true)}
                      >
                        Sil
                      </button>
                    </div>
                  )}
                  {confirmDelete && (
                    <div
                      className={styles.confirmArea}
                      role="group"
                      aria-label="Alerjen silme onayı"
                    >
                      <strong>Bu alerjen silinsin mi?</strong>
                      <span>Bu işlem geri alınamaz.</span>
                      <div>
                        <button type="button" onClick={() => setConfirmDelete(false)}>
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          disabled={busy}
                          onClick={() => void remove()}
                        >
                          {busy ? 'Siliniyor…' : 'Evet, sil'}
                        </button>
                      </div>
                    </div>
                  )}
                  {formError && (
                    <p className={styles.formError} role="alert">
                      {formError}
                    </p>
                  )}
                </div>
                <div className={styles.dialogFooter}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={busy || Boolean(busyProductId)}
                  >
                    {busy
                      ? 'Kaydediliyor…'
                      : dialog.kind === 'create'
                        ? 'Alerjen oluştur'
                        : 'Değişiklikleri kaydet'}
                  </button>
                </div>
              </form>
            )}
            {dialog.kind === 'edit' && tab === 'products' && (
              <div className={styles.dialogBody}>
                <p className={styles.formIntro}>
                  İşaretlediğiniz ürünlerde bu alerjen müşteriye gösterilir. Değişiklikler anında
                  kaydedilir.
                </p>
                {products === null ? (
                  <div className={styles.relationEmpty}>
                    Ürün listesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.
                  </div>
                ) : (
                  <>
                    <label className={styles.productSearch}>
                      Ürün ara
                      <input
                        value={productQuery}
                        onChange={(event) => setProductQuery(event.target.value)}
                        placeholder="Ürün adı"
                      />
                    </label>
                    <div className={styles.productList}>
                      {visibleProducts.map((product) => {
                        const linked = linkedProductIds.has(product.id);
                        return (
                          <label
                            key={product.id}
                            className={linked ? styles.productLinked : styles.productItem}
                          >
                            <input
                              type="checkbox"
                              checked={linked}
                              disabled={Boolean(busyProductId) || busy}
                              onChange={() => void toggleProduct(product.id, linked)}
                            />
                            <span>
                              <strong>{product.name}</strong>
                              <small>
                                {product.isActive ? 'Katalogda aktif' : 'Katalogda pasif'}
                              </small>
                            </span>
                            <em>
                              {busyProductId === product.id
                                ? 'Kaydediliyor…'
                                : linked
                                  ? 'Bağlı'
                                  : 'Bağla'}
                            </em>
                          </label>
                        );
                      })}
                      {!visibleProducts.length && (
                        <div className={styles.relationEmpty}>Aramaya uygun ürün bulunamadı.</div>
                      )}
                    </div>
                  </>
                )}
                {formError && (
                  <p className={styles.formError} role="alert">
                    {formError}
                  </p>
                )}
                <div className={styles.relationFooter}>
                  <span>{selected?.products.length ?? 0} ürüne bağlı</span>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </dialog>
    </main>
  );
}
