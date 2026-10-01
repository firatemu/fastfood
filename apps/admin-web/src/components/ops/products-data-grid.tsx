'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { OpsIcon } from './ops-icon';
import styles from '../../app/catalog/products/products.module.css';

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

type GridColumn = 'category' | 'price' | 'order' | 'status';

const COLUMN_LABELS: Record<GridColumn, string> = {
  category: 'Kategori',
  price: 'Baz fiyat',
  order: 'Sıra',
  status: 'Yayın durumu',
};

const PAGE_SIZES = [10, 25, 50] as const;

export function ProductsDataGrid<Row extends ProductsDataGridRow>(
  props: ProductsDataGridProps<Row>,
): ReactElement {
  const [pageSize, setPageSize] = useState<number>(25);
  const [pagination, setPagination] = useState<{ rows: Row[]; index: number }>(() => ({
    rows: props.rows,
    index: 0,
  }));
  const [visibleColumns, setVisibleColumns] = useState<Set<GridColumn>>(
    () => new Set(['category', 'price', 'order', 'status']),
  );
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);

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

  const pageCount = Math.max(1, Math.ceil(props.rows.length / pageSize));
  const pageIndex = pagination.rows === props.rows ? pagination.index : 0;
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageRows = useMemo(
    () => props.rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [currentPage, pageSize, props.rows],
  );
  const allSelected = props.rows.length > 0 && props.rows.every((row) => props.selectedIds.has(row.id));
  const someSelected = !allSelected && props.rows.some((row) => props.selectedIds.has(row.id));
  const firstRecord = props.rows.length === 0 ? 0 : currentPage * pageSize + 1;
  const lastRecord = Math.min((currentPage + 1) * pageSize, props.rows.length);
  const isColumnVisible = (column: GridColumn) => visibleColumns.has(column);

  const toggleColumn = (column: GridColumn, checked: boolean) => {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (checked) next.add(column);
      else next.delete(column);
      return next;
    });
  };

  return (
    <section className={styles.tablePanel} aria-label="Ürün kataloğu kayıtları">
      <div className={styles.tableTopline}>
        <div>
          <h2>Katalog kayıtları</h2>
          <p>{props.rows.length} ürün listeleniyor</p>
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
              <OpsIcon name="modifiers" /> Sütunlar <span>{visibleColumns.size}</span>
            </button>
            {columnsOpen ? (
              <div className={styles.columnMenuPanel} role="group" aria-label="Görünür sütunlar">
                {(Object.keys(COLUMN_LABELS) as GridColumn[]).map((column) => (
                  <label key={column}>
                    <input
                      type="checkbox"
                      checked={isColumnVisible(column)}
                      onChange={(event) => toggleColumn(column, event.target.checked)}
                    />
                    <span>{COLUMN_LABELS[column]}</span>
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
            <tr>
              <th className={styles.selectCell} scope="col">
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  aria-label="Filtrelenen ürünleri seç"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) node.indeterminate = someSelected;
                  }}
                  onChange={(event) => props.onToggleSelectAll(event.target.checked)}
                />
              </th>
              <th scope="col">Ürün</th>
              {isColumnVisible('category') ? <th scope="col">Kategori</th> : null}
              {isColumnVisible('price') ? <th scope="col" className={styles.numeric}>Baz fiyat</th> : null}
              {isColumnVisible('order') ? <th scope="col" className={styles.numeric}>Sıra</th> : null}
              {isColumnVisible('status') ? <th scope="col">Yayın durumu</th> : null}
              <th scope="col"><span className={styles.visuallyHidden}>İşlemler</span></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} data-selected={props.selectedIds.has(row.id) ? 'true' : undefined}>
                <td className={styles.selectCell}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    aria-label={`${row.name} ürününü seç`}
                    checked={props.selectedIds.has(row.id)}
                    onChange={(event) => props.onToggleSelected(row.id, event.target.checked)}
                  />
                </td>
                <td>
                  <div className={styles.productIdentity}>
                    <span className={styles.productGlyph}><OpsIcon name="fastfood" /></span>
                    <span className={styles.productText}>
                      <strong>{row.name}</strong>
                      <code>{row.slug || row.id}</code>
                    </span>
                  </div>
                </td>
                {isColumnVisible('category') ? (
                  <td>
                    <span className={styles.categoryName}>
                      {props.categories.find((category) => category.id === row.categoryId)?.name ?? 'Kategori atanmamış'}
                    </span>
                  </td>
                ) : null}
                {isColumnVisible('price') ? (
                  <td className={`${styles.numeric} ${styles.price}`}>
                    {row.basePriceMinor ? formatTryMinor(row.basePriceMinor, row.currency ?? 'TRY') : '—'}
                  </td>
                ) : null}
                {isColumnVisible('order') ? (
                  <td className={`${styles.numeric} ${styles.orderNumber}`}>
                    {String(row.displayOrder ?? 0).padStart(2, '0')}
                  </td>
                ) : null}
                {isColumnVisible('status') ? (
                  <td>
                    <span className={`${styles.status} ${row.isActive === false ? styles.inactive : styles.published}`}>
                      <i /> {row.isActive === false ? 'Arşivde' : 'Yayında'}
                    </span>
                  </td>
                ) : null}
                <td className={styles.actionCell}>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => props.onEdit(row.id)}
                    aria-label={`${row.name} ürününü düzenle`}
                  >
                    <OpsIcon name="edit" /> <span>Düzenle</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className={styles.tableFooter}>
        <span>
          {firstRecord}–{lastRecord} / {props.rows.length} ürün
          {props.rows.length !== props.totalCount ? ` · toplam ${props.totalCount}` : ''}
        </span>
        <div className={styles.pagination} aria-label="Tablo sayfaları">
          <label>
            <span>Satır</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPagination({ rows: props.rows, index: 0 });
              }}
              aria-label="Sayfa başına satır"
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button
            type="button"
            className={styles.pageButton}
            aria-label="Önceki sayfa"
            disabled={currentPage === 0}
            onClick={() => setPagination({ rows: props.rows, index: Math.max(0, currentPage - 1) })}
          >
            ‹
          </button>
          <span className={styles.pageCount}>{currentPage + 1} / {pageCount}</span>
          <button
            type="button"
            className={styles.pageButton}
            aria-label="Sonraki sayfa"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPagination({ rows: props.rows, index: Math.min(pageCount - 1, currentPage + 1) })}
          >
            ›
          </button>
        </div>
      </footer>
    </section>
  );
}
