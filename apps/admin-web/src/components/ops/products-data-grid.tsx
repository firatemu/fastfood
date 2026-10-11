'use client';

import { formatTryMinor } from '@fastfood/contracts';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import styles from '../../app/catalog/products/products.module.css';

import { OpsIcon } from './ops-icon';

export interface ProductsDataGridRow {
  id: string;
  name: string;
  slug?: string;
  categoryId?: string;
  basePriceMinor?: string;
  currency?: string;
  displayOrder?: number;
  isActive?: boolean;
}

interface ProductsDataGridProps<Row extends ProductsDataGridRow> {
  rows: Row[];
  totalCount: number;
  categories: Array<{ id: string; name: string }>;
  selectedIds: Set<string>;
  onToggleSelectAll: (selected: boolean) => void;
  onToggleSelected: (id: string, selected: boolean) => void;
  onEdit: (id: string) => void;
}

const PAGE_SIZES = [10, 25, 50] as const;

/** Columns whose cells are right-aligned; mirrors the CSS `.numeric` class. */
const NUMERIC_COLUMNS = new Set(['price', 'displayOrder']);

/** aria-sort only accepts these three tokens. */
function ariaSort(sorted: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (sorted === 'asc') return 'ascending';
  if (sorted === 'desc') return 'descending';
  return 'none';
}

function cellClass(columnId: string): string | undefined {
  const classes = [
    columnId === 'select' ? styles.selectCell : undefined,
    columnId === 'actions' ? styles.actionCell : undefined,
    NUMERIC_COLUMNS.has(columnId) ? styles.numeric : undefined,
  ].filter(Boolean);
  return classes.length > 0 ? classes.join(' ') : undefined;
}

export function ProductsDataGrid<Row extends ProductsDataGridRow>(
  props: ProductsDataGridProps<Row>,
): ReactElement {
  const { rows, totalCount, categories, selectedIds, onToggleSelectAll, onToggleSelected, onEdit } =
    props;

  // TanStack owns sorting, pagination and column visibility. The page keeps
  // ownership of the row data and of the selection set (persisted in sessionStorage).
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayOrder', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) map.set(category.id, category.name);
    return map;
  }, [categories]);

  useEffect(() => {
    if (!columnsOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !columnMenuRef.current?.contains(event.target)) {
        setColumnsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [columnsOpen]);

  // Filtering re-shapes the row set: a page index from the previous result set
  // would otherwise leave the operator on an empty page.
  useEffect(() => {
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = !allSelected && rows.some((row) => selectedIds.has(row.id));

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <input
            type="checkbox"
            className={styles.checkbox}
            aria-label="Filtrelenen ürünleri seç"
            checked={allSelected}
            ref={(node) => {
              if (node) node.indeterminate = someSelected;
            }}
            onChange={(event) => onToggleSelectAll(event.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className={styles.checkbox}
            aria-label={`${row.original.name} ürününü seç`}
            checked={selectedIds.has(row.original.id)}
            onChange={(event) => onToggleSelected(row.original.id, event.target.checked)}
          />
        ),
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: 'Ürün',
        enableHiding: false,
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, 'tr'),
        cell: ({ row }) => (
          <div className={styles.productIdentity}>
            <span className={styles.productGlyph}>
              <OpsIcon name="fastfood" />
            </span>
            <span className={styles.productText}>
              <strong>{row.original.name}</strong>
              <code>{row.original.slug || row.original.id}</code>
            </span>
          </div>
        ),
      },
      {
        id: 'category',
        accessorFn: (row) => categoryNameById.get(row.categoryId ?? '') ?? '',
        header: 'Kategori',
        sortingFn: (a, b) =>
          (categoryNameById.get(a.original.categoryId ?? '') ?? '').localeCompare(
            categoryNameById.get(b.original.categoryId ?? '') ?? '',
            'tr',
          ),
        cell: ({ row }) => (
          <span className={styles.categoryName}>
            {categoryNameById.get(row.original.categoryId ?? '') ?? 'Kategori atanmamış'}
          </span>
        ),
      },
      {
        id: 'price',
        accessorFn: (row) => Number(row.basePriceMinor ?? -1),
        header: 'Baz fiyat',
        sortingFn: (a, b) =>
          Number(a.original.basePriceMinor ?? -1) - Number(b.original.basePriceMinor ?? -1),
        cell: ({ row }) => (
          <span className={styles.price}>
            {row.original.basePriceMinor
              ? formatTryMinor(row.original.basePriceMinor, row.original.currency ?? 'TRY')
              : '—'}
          </span>
        ),
      },
      {
        id: 'displayOrder',
        accessorFn: (row) => row.displayOrder ?? 0,
        header: 'Sıra',
        cell: ({ row }) => (
          <span className={styles.orderNumber}>
            {String(row.original.displayOrder ?? 0).padStart(2, '0')}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => (row.isActive === false ? 0 : 1),
        header: 'Yayın durumu',
        cell: ({ row }) => (
          <span
            className={`${styles.status} ${
              row.original.isActive === false ? styles.inactive : styles.published
            }`}
          >
            <i /> {row.original.isActive === false ? 'Arşivde' : 'Yayında'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className={styles.visuallyHidden}>İşlemler</span>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.editButton}
            onClick={() => onEdit(row.original.id)}
            aria-label={`${row.original.name} ürününü düzenle`}
          >
            <OpsIcon name="edit" /> <span>Düzenle</span>
          </button>
        ),
      },
    ],
    [
      allSelected,
      someSelected,
      categoryNameById,
      selectedIds,
      onToggleSelectAll,
      onToggleSelected,
      onEdit,
    ],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  const hideableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const visibleColumnCount = hideableColumns.filter((column) => column.getIsVisible()).length;
  const pageRows = table.getRowModel().rows;
  const firstRecord = rows.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const lastRecord = Math.min((pagination.pageIndex + 1) * pagination.pageSize, rows.length);

  return (
    <section className={styles.tablePanel} aria-label="Ürün kataloğu kayıtları">
      <div className={styles.tableTopline}>
        <div>
          <h2>Katalog kayıtları</h2>
          <p>{rows.length} ürün listeleniyor</p>
        </div>
        <div className={styles.gridTools}>
          <span className={styles.viewLabel}>
            <i /> Güncel görünüm
          </span>
          <div className={styles.columnMenu} ref={columnMenuRef}>
            <button
              type="button"
              className={styles.columnMenuTrigger}
              aria-expanded={columnsOpen}
              aria-haspopup="true"
              onClick={() => setColumnsOpen((open) => !open)}
            >
              <OpsIcon name="tune" /> Sütunlar <span>{visibleColumnCount}</span>
            </button>
            {columnsOpen ? (
              <div className={styles.columnMenuPanel} role="group" aria-label="Görünür sütunlar">
                {hideableColumns.map((column) => (
                  <label key={column.id}>
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    <span>{String(column.columnDef.header)}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.tableScroll} role="region" aria-label="Ürün veri tablosu" tabIndex={0}>
        <table className={styles.productTable} aria-label="Ürün kataloğu">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const baseClass = cellClass(header.column.id);
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={
                        baseClass ? `${styles.headerCell} ${baseClass}` : styles.headerCell
                      }
                      aria-sort={canSort ? ariaSort(sorted) : undefined}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`${String(header.column.columnDef.header)} sütununa göre sırala`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className={styles.sortIndicator} aria-hidden="true">
                            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className={styles.tableEmpty}>
                  Bu filtrelerle eşleşen ürün yok.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} data-selected={selectedIds.has(row.id) ? 'true' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cellClass(cell.column.id)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className={styles.tableFooter}>
        <span>
          {firstRecord}–{lastRecord} / {rows.length} ürün
          {rows.length !== totalCount ? ` · toplam ${totalCount}` : ''}
        </span>
        <div className={styles.pagination} aria-label="Tablo sayfaları">
          <label>
            <span>Satır</span>
            <select
              value={pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              aria-label="Sayfa başına satır"
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
            className={styles.pageButton}
            aria-label="Önceki sayfa"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            ‹
          </button>
          <span className={styles.pageCount}>
            {pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            aria-label="Sonraki sayfa"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            ›
          </button>
        </div>
      </footer>
    </section>
  );
}
