import type { ReactNode } from 'react';

import './styles.css';

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyText?: string;
  rowKey: (row: T) => string;
  ariaLabel: string;
  /** Ops-dense default; comfortable for marketing-adjacent surfaces. */
  density?: 'compact' | 'comfortable';
  stickyHeader?: boolean;
  toolbar?: ReactNode;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  sortKey?: string;
  sortDirection?: DataTableSortDirection;
  onSortChange?: (key: string, direction: DataTableSortDirection) => void;
  captionVisible?: boolean;
}

/**
 * DataTable — production Ops data grid. Prefer this over ad-hoc HTML tables.
 * `Table` remains a thin alias for backward compatibility.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    rows,
    emptyText = 'Veri yok',
    rowKey,
    ariaLabel,
    density = 'compact',
    stickyHeader = true,
    toolbar,
    selectedKeys,
    onSelectionChange,
    sortKey,
    sortDirection = 'asc',
    onSortChange,
    captionVisible = false,
  } = props;

  const selectable = Boolean(onSelectionChange);
  const selected = new Set(selectedKeys ?? []);
  const allKeys = rows.map(rowKey);
  const allSelected = selectable && allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  function toggleAll() {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : allKeys);
  }

  function toggleOne(key: string) {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange([...next]);
  }

  function handleSort(col: DataTableColumn<T>) {
    if (!col.sortable || !onSortChange) return;
    const nextDir: DataTableSortDirection =
      sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(col.key, nextDir);
  }

  if (rows.length === 0) {
    return (
      <div className="ff-data-table">
        {toolbar ? <div className="ff-data-table__toolbar">{toolbar}</div> : null}
        <div role="status" className="ff-table-empty">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div className={`ff-data-table ff-data-table--${density}`}>
      {toolbar ? <div className="ff-data-table__toolbar">{toolbar}</div> : null}
      <div className="ff-table-wrapper">
        <table
          role="table"
          aria-label={ariaLabel}
          className={`ff-table${stickyHeader ? ' ff-table--sticky' : ''}`}
        >
          <caption
            className={captionVisible ? 'ff-table__caption--visible' : 'ff-table__caption sr-only'}
          >
            {ariaLabel}
          </caption>
          <thead>
            <tr>
              {selectable ? (
                <th scope="col" className="ff-table__select">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tüm satırları seç"
                  />
                </th>
              ) : null}
              {columns.map((c) => {
                const sorted = sortKey === c.key;
                const ariaSort = sorted
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : c.sortable
                    ? 'none'
                    : undefined;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    className={c.align ? `ff-table__cell--${c.align}` : undefined}
                    aria-sort={ariaSort}
                  >
                    {c.sortable && onSortChange ? (
                      <button
                        type="button"
                        className="ff-table__sort"
                        onClick={() => handleSort(c)}
                      >
                        {c.header}
                        {sorted ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              const isSelected = selected.has(key);
              return (
                <tr key={key} className={isSelected ? 'ff-table__row--selected' : undefined}>
                  {selectable ? (
                    <td className="ff-table__select">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(key)}
                        aria-label={`Satır ${key} seç`}
                      />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.key} className={c.align ? `ff-table__cell--${c.align}` : undefined}>
                      {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
