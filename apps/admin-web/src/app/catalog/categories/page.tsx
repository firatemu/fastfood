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
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { OpsIcon } from '../../../components/ops/ops-icon';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { createAdminClient } from '../../../lib/api';
import { slugFromName } from '../../../lib/catalog-ops';
import {
  adminCategoriesSchema,
  adminProductsSchema,
  categoryCreateSchema,
} from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './categories.module.css';

type Category = z.infer<typeof adminCategoriesSchema>['data'][number];
type Product = z.infer<typeof adminProductsSchema>['data'][number];
type CategoryRow = Category & {
  parentName: string | null;
  directProductCount: number | null;
  childCount: number;
};
type StatusFilter = 'all' | 'active' | 'inactive';
type LevelFilter = 'all' | 'root' | 'child';
type DialogState = { kind: 'create' } | { kind: 'edit'; category: Category } | null;
type EditTab = 'details' | 'relations';
type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  parentCategoryId: string;
  displayOrder: string;
  isActive: boolean;
};

const EMPTY_CATEGORIES: Category[] = [];
const PAGE_SIZES = [10, 20, 50];

function emptyDraft(parentCategoryId = ''): CategoryDraft {
  return {
    name: '',
    slug: '',
    description: '',
    parentCategoryId,
    displayOrder: '0',
    isActive: true,
  };
}

function categoryLabel(category: Category): string {
  return category.parentCategoryId ? 'Alt kategori' : 'Ana kategori';
}

export default function CatalogCategoriesPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Category[]>>({ status: 'loading' });
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [parentFilter, setParentFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayOrder', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [editTab, setEditTab] = useState<EditTab>('details');
  const [draft, setDraft] = useState<CategoryDraft>(() => emptyDraft());
  const [slugTouched, setSlugTouched] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const client = createAdminClient();
      const [categoryResult, productResult] = await Promise.allSettled([
        client.request({ path: 'admin/categories', schema: adminCategoriesSchema }),
        client.request({ path: 'admin/products', schema: adminProductsSchema }),
      ]);
      if (categoryResult.status === 'rejected') throw categoryResult.reason;
      setState(
        categoryResult.value.data.length
          ? { status: 'ready', data: categoryResult.value.data }
          : { status: 'empty' },
      );
      setProducts(productResult.status === 'fulfilled' ? productResult.value.data : null);
      if (productResult.status === 'fulfilled') markSynced();
      else markStale();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  useEffect(() => {
    if (!columnMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setColumnMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [columnMenuOpen]);

  useEffect(() => {
    if (!dialog) return;
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        setDialog(null);
        setConfirmDeactivate(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [dialog, busy]);

  const categories = state.status === 'ready' ? state.data : EMPTY_CATEGORIES;
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const childrenByParent = useMemo(() => {
    const groups = new Map<string, Category[]>();
    for (const category of categories) {
      if (!category.parentCategoryId) continue;
      const children = groups.get(category.parentCategoryId) ?? [];
      children.push(category);
      groups.set(category.parentCategoryId, children);
    }
    return groups;
  }, [categories]);
  const productsByCategory = useMemo(() => {
    if (!products) return null;
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      if (!product.categoryId) continue;
      const related = groups.get(product.categoryId) ?? [];
      related.push(product);
      groups.set(product.categoryId, related);
    }
    return groups;
  }, [products]);
  const rows = useMemo<CategoryRow[]>(
    () =>
      categories.map((category) => ({
        ...category,
        parentName: category.parentCategoryId
          ? (categoryById.get(category.parentCategoryId)?.name ?? 'Üst kategori bulunamadı')
          : null,
        directProductCount: productsByCategory
          ? (productsByCategory.get(category.id)?.length ?? 0)
          : null,
        childCount: childrenByParent.get(category.id)?.length ?? 0,
      })),
    [categories, categoryById, productsByCategory, childrenByParent],
  );

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return rows.filter((row) => {
      if (statusFilter === 'active' && row.isActive === false) return false;
      if (statusFilter === 'inactive' && row.isActive !== false) return false;
      if (levelFilter === 'root' && row.parentCategoryId) return false;
      if (levelFilter === 'child' && !row.parentCategoryId) return false;
      if (parentFilter && row.parentCategoryId !== parentFilter) return false;
      if (!needle) return true;
      return [row.name, row.slug ?? '', row.parentName ?? '', row.description ?? ''].some((value) =>
        value.toLocaleLowerCase('tr-TR').includes(needle),
      );
    });
  }, [rows, query, statusFilter, levelFilter, parentFilter]);

  const openCreate = useCallback((parentCategoryId = '') => {
    if (
      document.activeElement instanceof HTMLElement &&
      !dialogRef.current?.contains(document.activeElement)
    ) {
      triggerRef.current = document.activeElement;
    }
    setDraft(emptyDraft(parentCategoryId));
    setSlugTouched(false);
    setConfirmDeactivate(false);
    setFormError(null);
    setEditTab('details');
    setDialog({ kind: 'create' });
  }, []);

  const openEdit = useCallback((category: Category) => {
    if (
      document.activeElement instanceof HTMLElement &&
      !dialogRef.current?.contains(document.activeElement)
    ) {
      triggerRef.current = document.activeElement;
    }
    setDraft({
      name: category.name,
      slug: category.slug ?? '',
      description: category.description ?? '',
      parentCategoryId: category.parentCategoryId ?? '',
      displayOrder: String(category.displayOrder ?? 0),
      isActive: category.isActive !== false,
    });
    setConfirmDeactivate(false);
    setFormError(null);
    setEditTab('details');
    setDialog({ kind: 'edit', category });
  }, []);

  function closeDialog() {
    if (busy) return;
    setDialog(null);
    setConfirmDeactivate(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function saveCategory(confirmed = false) {
    if (!dialog) return;
    const name = draft.name.trim();
    const slug = draft.slug.trim();
    const description = draft.description.trim();
    const displayOrder = Number(draft.displayOrder);
    if (!name || name.length > 128 || !Number.isInteger(displayOrder) || displayOrder < 0) {
      setFormError('Kategori adı ve sıfır veya daha büyük bir tam sayı olarak sıra girin.');
      return;
    }
    if (description.length > 1024) {
      setFormError('Açıklama en fazla 1024 karakter olabilir.');
      return;
    }
    if (dialog.kind === 'create' && (!slug || slug.length > 128)) {
      setFormError('1–128 karakter uzunluğunda bir slug girin.');
      return;
    }
    if (
      dialog.kind === 'edit' &&
      dialog.category.isActive !== false &&
      !draft.isActive &&
      !confirmed
    ) {
      setConfirmDeactivate(true);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const creating = dialog.kind === 'create';
      await createAdminClient().request({
        method: creating ? 'POST' : 'PATCH',
        path: creating ? 'admin/categories' : `admin/categories/${dialog.category.id}`,
        body: creating
          ? {
              name,
              slug,
              ...(description ? { description } : {}),
              ...(draft.parentCategoryId ? { parentCategoryId: draft.parentCategoryId } : {}),
              displayOrder,
            }
          : {
              name,
              description: description || null,
              displayOrder,
              isActive: draft.isActive,
            },
        schema: categoryCreateSchema,
      });
      await load();
      setNotice(creating ? 'Kategori oluşturuldu.' : 'Kategori güncellendi.');
      setDialog(null);
      setConfirmDeactivate(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveCategory();
  }

  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: 'Kategori',
        enableHiding: false,
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, 'tr'),
        cell: ({ row }) => (
          <button
            className={styles.categoryLink}
            type="button"
            onClick={() => openEdit(row.original)}
            aria-label={`${row.original.name} kategorisini düzenle`}
          >
            <span
              className={styles.categoryMark}
              data-level={row.original.parentCategoryId ? 'child' : 'root'}
            >
              <OpsIcon
                name={row.original.parentCategoryId ? 'subdirectory_arrow_right' : 'category'}
              />
            </span>
            <span className={styles.categoryIdentity}>
              <strong>{row.original.name}</strong>
              <small>{row.original.description || categoryLabel(row.original)}</small>
            </span>
          </button>
        ),
      },
      {
        id: 'parent',
        accessorFn: (row) => row.parentName ?? '',
        header: 'Hiyerarşi',
        sortingFn: (a, b) =>
          (a.original.parentName ?? '').localeCompare(b.original.parentName ?? '', 'tr'),
        cell: ({ row }) => (
          <span className={row.original.parentCategoryId ? styles.parentChild : styles.parentRoot}>
            {row.original.parentName ?? 'Ana kategori'}
          </span>
        ),
      },
      {
        id: 'slug',
        accessorFn: (row) => row.slug ?? '',
        header: 'Slug',
        cell: ({ row }) => <code className={styles.slug}>{row.original.slug ?? '—'}</code>,
      },
      {
        id: 'products',
        accessorFn: (row) => row.directProductCount ?? -1,
        header: 'Ürün',
        cell: ({ row }) => (
          <span className={styles.count} title="Doğrudan bağlı ürün sayısı">
            {row.original.directProductCount ?? '—'}
          </span>
        ),
      },
      {
        id: 'children',
        accessorFn: (row) => row.childCount,
        header: 'Alt kategori',
        cell: ({ row }) => <span className={styles.count}>{row.original.childCount}</span>,
      },
      {
        id: 'displayOrder',
        accessorFn: (row) => row.displayOrder ?? 0,
        header: 'Sıra',
        cell: ({ row }) => <span className={styles.order}>{row.original.displayOrder ?? 0}</span>,
      },
      {
        id: 'status',
        accessorFn: (row) => (row.isActive === false ? 0 : 1),
        header: 'Durum',
        cell: ({ row }) => (
          <span
            className={`${styles.status} ${row.original.isActive === false ? styles.statusInactive : ''}`}
          >
            <i />
            {row.original.isActive === false ? 'Pasif' : 'Aktif'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'İşlem',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button className={styles.rowAction} type="button" onClick={() => openEdit(row.original)}>
            <OpsIcon name="edit" />
            Düzenle
          </button>
        ),
      },
    ],
    [openEdit],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const editingCategory =
    dialog?.kind === 'edit' ? (categoryById.get(dialog.category.id) ?? dialog.category) : null;
  const relatedProducts = editingCategory
    ? (productsByCategory?.get(editingCategory.id) ?? [])
    : [];
  const childCategories = editingCategory ? (childrenByParent.get(editingCategory.id) ?? []) : [];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            Katalog <span>/</span> Kategoriler
          </div>
          <h1>Kategoriler</h1>
          <p>Katalog yapısını, sıralamayı ve yayın durumunu yönetin.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => openCreate()}>
          <OpsIcon name="add" /> Yeni kategori
        </button>
      </header>

      {notice && !dialog ? (
        <div className={styles.notice} role="status">
          <OpsIcon name="check_circle" />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Bildirimi kapat">
            ×
          </button>
        </div>
      ) : null}

      <section className={styles.gridPanel} aria-label="Kategori kataloğu">
        <div className={styles.gridHeader}>
          <div>
            <span className={styles.gridEyebrow}>KATALOG YAPISI</span>
            <h2>Kategori listesi</h2>
            <p>
              {state.status === 'ready' || state.status === 'empty'
                ? `${filteredRows.length} kayıt görüntüleniyor`
                : 'Kategoriler yükleniyor'}
            </p>
          </div>
          <div className={styles.gridTools}>
            <label className={styles.search}>
              <OpsIcon name="search" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                placeholder="Kategori, slug veya açıklama ara"
                aria-label="Kategori ara"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                  }}
                  aria-label="Aramayı temizle"
                >
                  ×
                </button>
              ) : null}
            </label>
            <button
              className={styles.toolButton}
              type="button"
              onClick={() => void load()}
              aria-label="Listeyi yenile"
            >
              <OpsIcon name="refresh" />
            </button>
            <div className={styles.columnMenu} ref={menuRef}>
              <button
                className={styles.toolButton}
                type="button"
                aria-haspopup="menu"
                aria-expanded={columnMenuOpen}
                onClick={() => setColumnMenuOpen((open) => !open)}
              >
                <OpsIcon name="view_column" /> Sütunlar
              </button>
              {columnMenuOpen ? (
                <div className={styles.columnMenuPanel} role="menu" aria-label="Görünür sütunlar">
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
                        {typeof column.columnDef.header === 'string'
                          ? column.columnDef.header
                          : column.id}
                      </label>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.segmented} aria-label="Durum filtresi">
            {(
              [
                ['all', 'Tümü', categories.length],
                [
                  'active',
                  'Aktif',
                  categories.filter((category) => category.isActive !== false).length,
                ],
                [
                  'inactive',
                  'Pasif',
                  categories.filter((category) => category.isActive === false).length,
                ],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? styles.filterActive : styles.filterButton}
                onClick={() => {
                  setStatusFilter(value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                aria-pressed={statusFilter === value}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <span className={styles.filterDivider} aria-hidden="true" />
          <label className={styles.levelSelect}>
            <span>Yapı</span>
            <select
              value={levelFilter}
              onChange={(event) => {
                const nextLevel = event.target.value as LevelFilter;
                setLevelFilter(nextLevel);
                if (nextLevel !== 'child') setParentFilter('');
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <option value="all">Tüm seviyeler</option>
              <option value="root">Ana kategoriler</option>
              <option value="child">Alt kategoriler</option>
            </select>
          </label>
          {levelFilter === 'child' ? (
            <label className={styles.levelSelect}>
              <span>Üst</span>
              <select
                value={parentFilter}
                onChange={(event) => {
                  setParentFilter(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
              >
                <option value="">Tüm üst kategoriler</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {products === null && state.status === 'ready' ? (
            <span className={styles.dataHint}>Ürün sayıları alınamadı</span>
          ) : null}
        </div>

        {state.status === 'loading' ? (
          <div className={styles.statePanel} role="status">
            <OpsIcon name="progress_activity" />
            <strong>Kategoriler yükleniyor</strong>
            <span>Katalog kayıtları getiriliyor.</span>
          </div>
        ) : state.status === 'error' ? (
          <div className={styles.statePanel} role="alert">
            <OpsIcon name="error" />
            <strong>Kategoriler alınamadı</strong>
            <span>{errorMessage(state.error)}</span>
            <button type="button" onClick={() => void load()}>
              Tekrar dene
            </button>
          </div>
        ) : state.status === 'empty' ? (
          <div className={styles.statePanel}>
            <OpsIcon name="category" />
            <strong>Henüz kategori yok</strong>
            <span>İlk kategoriyi oluşturarak kataloğu düzenleyin.</span>
            <button type="button" onClick={() => openCreate()}>
              Kategori oluştur
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className={styles.statePanel}>
            <OpsIcon name="filter_alt_off" />
            <strong>Sonuç bulunamadı</strong>
            <span>Aramayı veya filtreleri değiştirin.</span>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
                setLevelFilter('all');
                setParentFilter('');
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} scope="col">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className={styles.sortButton}
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            aria-label={`${String(header.column.columnDef.header)} sütununa göre sırala`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className={styles.sortIndicator}>
                              {header.column.getIsSorted() === 'asc'
                                ? '↑'
                                : header.column.getIsSorted() === 'desc'
                                  ? '↓'
                                  : '↕'}
                            </span>
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.original.isActive === false ? styles.inactiveRow : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {state.status === 'ready' && filteredRows.length > 0 ? (
          <footer className={styles.gridFooter}>
            <span>
              {pagination.pageIndex * pagination.pageSize + 1}–
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRows.length)} /{' '}
              {filteredRows.length} kategori
            </span>
            <div className={styles.pagination}>
              <label>
                Satır
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
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Önceki sayfa"
              >
                <OpsIcon name="chevron_left" />
              </button>
              <span>
                {pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Sonraki sayfa"
              >
                <OpsIcon name="chevron_right" />
              </button>
            </div>
          </footer>
        ) : null}
      </section>

      {dialog ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className={styles.dialog}
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
                ),
              ).filter((element) => element.tabIndex >= 0);
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (
                event.shiftKey &&
                (document.activeElement === first || document.activeElement === event.currentTarget)
              ) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <header className={styles.dialogHeader}>
              <span className={styles.dialogGlyph}>
                <OpsIcon name={dialog.kind === 'create' ? 'create_new_folder' : 'folder_open'} />
              </span>
              <div>
                <span className={styles.dialogEyebrow}>
                  {dialog.kind === 'create'
                    ? 'YENİ KATALOG KAYDI'
                    : `KATEGORİ / ${editingCategory?.slug ?? ''}`}
                </span>
                <h2 id="category-dialog-title">
                  {dialog.kind === 'create' ? 'Kategori oluştur' : editingCategory?.name}
                </h2>
                <p>
                  {dialog.kind === 'create'
                    ? 'Katalog hiyerarşisinde yeni bir kategori açın.'
                    : 'Kategori bilgilerini ve bağlı kayıtları yönetin.'}
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={closeDialog}
                disabled={busy}
                aria-label="Pencereyi kapat"
              >
                ×
              </button>
            </header>

            {dialog.kind === 'edit' ? (
              <div
                className={styles.dialogTabs}
                role="tablist"
                aria-label="Kategori bölümleri"
                onKeyDown={(event) => {
                  const nextTab: EditTab | null =
                    event.key === 'ArrowRight' || event.key === 'ArrowLeft'
                      ? editTab === 'details'
                        ? 'relations'
                        : 'details'
                      : event.key === 'End'
                        ? 'relations'
                        : event.key === 'Home'
                          ? 'details'
                          : null;
                  if (!nextTab) return;
                  event.preventDefault();
                  setEditTab(nextTab);
                  window.requestAnimationFrame(() =>
                    document.getElementById(`category-tab-${nextTab}`)?.focus(),
                  );
                }}
              >
                <button
                  id="category-tab-details"
                  type="button"
                  role="tab"
                  aria-selected={editTab === 'details'}
                  aria-controls="category-dialog-panel"
                  tabIndex={editTab === 'details' ? 0 : -1}
                  className={editTab === 'details' ? styles.dialogTabActive : styles.dialogTab}
                  onClick={() => setEditTab('details')}
                >
                  <OpsIcon name="edit_note" /> Bilgiler
                </button>
                <button
                  id="category-tab-relations"
                  type="button"
                  role="tab"
                  aria-selected={editTab === 'relations'}
                  aria-controls="category-dialog-panel"
                  tabIndex={editTab === 'relations' ? 0 : -1}
                  className={editTab === 'relations' ? styles.dialogTabActive : styles.dialogTab}
                  onClick={() => setEditTab('relations')}
                >
                  <OpsIcon name="account_tree" /> İlişkiler{' '}
                  <span>
                    {childCategories.length + (productsByCategory ? relatedProducts.length : 0)}
                  </span>
                </button>
              </div>
            ) : null}

            <div
              className={styles.dialogBody}
              id="category-dialog-panel"
              role={dialog.kind === 'edit' ? 'tabpanel' : undefined}
              aria-labelledby={dialog.kind === 'edit' ? `category-tab-${editTab}` : undefined}
            >
              {formError ? (
                <div className={styles.formError} role="alert">
                  <OpsIcon name="error" /> {formError}
                </div>
              ) : null}
              {dialog.kind === 'create' || editTab === 'details' ? (
                <form id="category-form" onSubmit={submitCategory}>
                  <div className={styles.formHeading}>
                    <span>{dialog.kind === 'create' ? 'KATEGORİ TANIMI' : 'TEMEL BİLGİLER'}</span>
                    <h3>{dialog.kind === 'create' ? 'Yeni kategori' : 'Kategori ayarları'}</h3>
                    <p>Ad, açıklama ve sıralama katalog görünümünde kullanılır.</p>
                  </div>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>
                        Kategori adı <b>*</b>
                      </span>
                      <input
                        autoFocus
                        maxLength={128}
                        value={draft.name}
                        onChange={(event) => {
                          const nextName = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            name: nextName,
                            slug:
                              dialog.kind === 'create' && !slugTouched
                                ? slugFromName(nextName)
                                : current.slug,
                          }));
                        }}
                        placeholder="Örn. Burgerler"
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        Slug {dialog.kind === 'create' ? <b>*</b> : <small>Değiştirilemez</small>}
                      </span>
                      <input
                        maxLength={128}
                        value={draft.slug}
                        readOnly={dialog.kind === 'edit'}
                        onChange={(event) => {
                          setSlugTouched(true);
                          setDraft((current) => ({ ...current, slug: event.target.value }));
                        }}
                        placeholder="burgerler"
                        required
                      />
                    </label>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>
                        Açıklama <small>İsteğe bağlı</small>
                      </span>
                      <textarea
                        maxLength={1024}
                        rows={3}
                        value={draft.description}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Kategoriye kısa bir açıklama ekleyin"
                      />
                      <small>{draft.description.length} / 1024</small>
                    </label>
                    <label className={styles.field}>
                      <span>Üst kategori</span>
                      {dialog.kind === 'create' ? (
                        <select
                          value={draft.parentCategoryId}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              parentCategoryId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Ana kategori olarak oluştur</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                              {category.isActive === false ? ' · Pasif' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          readOnly
                          value={
                            draft.parentCategoryId
                              ? (categoryById.get(draft.parentCategoryId)?.name ??
                                'Üst kategori bulunamadı')
                              : 'Ana kategori'
                          }
                        />
                      )}
                      {dialog.kind === 'edit' ? (
                        <small>Üst kategori daha sonra değiştirilemez.</small>
                      ) : null}
                    </label>
                    <label className={styles.field}>
                      <span>Gösterim sırası</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draft.displayOrder}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, displayOrder: event.target.value }))
                        }
                        required
                      />
                    </label>
                  </div>
                  {dialog.kind === 'edit' ? (
                    <label className={styles.statusControl}>
                      <span className={styles.statusControlIcon}>
                        <OpsIcon name="visibility" />
                      </span>
                      <span>
                        <strong>Yayın durumu</strong>
                        <small>{draft.isActive ? 'Kategori aktif' : 'Kategori pasif'}</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, isActive: event.target.checked }));
                          setConfirmDeactivate(false);
                        }}
                      />
                    </label>
                  ) : null}
                  {confirmDeactivate ? (
                    <div className={styles.confirmBox} role="alert">
                      <OpsIcon name="warning" />
                      <div>
                        <strong>Kategoriyi pasife al?</strong>
                        <p>
                          Bağlı ürün ve alt kategori kayıtları korunur. Bu kategorinin yayın durumu
                          değişir.
                        </p>
                      </div>
                      <button type="button" onClick={() => setConfirmDeactivate(false)}>
                        Vazgeç
                      </button>
                      <button type="button" onClick={() => void saveCategory(true)} disabled={busy}>
                        Pasifleştir ve kaydet
                      </button>
                    </div>
                  ) : null}
                </form>
              ) : (
                <div className={styles.relations}>
                  <div className={styles.relationHeader}>
                    <div>
                      <span>KATEGORİ BAĞLANTILARI</span>
                      <h3>İlişkiler</h3>
                      <p>Bu kategoriye doğrudan bağlı kayıtlar.</p>
                    </div>
                    <button type="button" onClick={() => openCreate(editingCategory?.id ?? '')}>
                      <OpsIcon name="add" /> Alt kategori ekle
                    </button>
                  </div>
                  <div className={styles.relationSection}>
                    <div className={styles.relationSectionTitle}>
                      <h4>Alt kategoriler</h4>
                      <span>{childCategories.length}</span>
                    </div>
                    {childCategories.length ? (
                      childCategories.map((child) => (
                        <button
                          className={styles.relationRow}
                          key={child.id}
                          type="button"
                          onClick={() => openEdit(child)}
                        >
                          <OpsIcon name="subdirectory_arrow_right" />
                          <span>
                            <strong>{child.name}</strong>
                            <small>{child.slug}</small>
                          </span>
                          <span
                            className={
                              child.isActive === false
                                ? styles.relationInactive
                                : styles.relationActive
                            }
                          >
                            {child.isActive === false ? 'Pasif' : 'Aktif'}
                          </span>
                          <OpsIcon name="chevron_right" />
                        </button>
                      ))
                    ) : (
                      <p className={styles.relationEmpty}>
                        Bu kategori altında başka kategori yok.
                      </p>
                    )}
                  </div>
                  <div className={styles.relationSection}>
                    <div className={styles.relationSectionTitle}>
                      <h4>Doğrudan bağlı ürünler</h4>
                      <span>{productsByCategory ? relatedProducts.length : '—'}</span>
                    </div>
                    {productsByCategory ? (
                      relatedProducts.length ? (
                        relatedProducts.map((product) => (
                          <div className={styles.relationRow} key={product.id}>
                            <OpsIcon name="inventory_2" />
                            <span>
                              <strong>{product.name}</strong>
                              <small>{product.slug}</small>
                            </span>
                            <span
                              className={
                                product.isActive === false
                                  ? styles.relationInactive
                                  : styles.relationActive
                              }
                            >
                              {product.isActive === false ? 'Pasif' : 'Aktif'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className={styles.relationEmpty}>
                          Bu kategoriye doğrudan bağlı ürün yok.
                        </p>
                      )
                    ) : (
                      <p className={styles.relationEmpty}>
                        Ürün listesi alınamadı. Sayfayı yenileyerek tekrar deneyin.
                      </p>
                    )}
                    <Link
                      className={styles.productLink}
                      href={`/catalog/products?category=${encodeURIComponent(editingCategory?.id ?? '')}`}
                    >
                      Bu kategorinin ürünlerini aç <OpsIcon name="arrow_forward" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <footer className={styles.dialogFooter}>
              <span>
                {dialog.kind === 'edit'
                  ? `Kayıt: ${editingCategory?.id.slice(0, 8).toUpperCase()}`
                  : 'Yeni kategori'}
              </span>
              <div>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={closeDialog}
                  disabled={busy}
                >
                  Kapat
                </button>
                {(dialog.kind === 'create' || editTab === 'details') && !confirmDeactivate ? (
                  <button
                    className={styles.primaryButton}
                    type="submit"
                    form="category-form"
                    disabled={busy}
                  >
                    {busy
                      ? 'Kaydediliyor…'
                      : dialog.kind === 'create'
                        ? 'Kategori oluştur'
                        : 'Değişiklikleri kaydet'}
                  </button>
                ) : null}
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
