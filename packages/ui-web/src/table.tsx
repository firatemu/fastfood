import { DataTable, type DataTableProps } from './data-table.js';
import './styles.css';

export type { DataTableColumn as TableColumn } from './data-table.js';

export type TableProps<T> = DataTableProps<T>;

/**
 * Table — accessible data grid wrapper. Delegates to DataTable.
 * Prefer `DataTable` for new Ops surfaces.
 */
export function Table<T>(props: TableProps<T>) {
  return (
    <DataTable
      {...props}
      density={props.density ?? 'comfortable'}
      stickyHeader={props.stickyHeader ?? false}
    />
  );
}

/** Re-export for consumers that import column types from table. */
export type { DataTableProps };
