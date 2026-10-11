import type { ReactNode } from 'react';

export interface OperationalTableColumn<T> {
  key: string;
  header: string | ReactNode;
  numeric?: boolean;
  mono?: boolean;
  render: (row: T) => ReactNode;
}

export interface OperationalTableProps<T> {
  columns: OperationalTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  ariaLabel: string;
  onRowClick?: (row: T) => void;
}

export function OperationalTable<T>(props: OperationalTableProps<T>) {
  return (
    <div className="ops-table-wrap">
      <table className="ops-table" aria-label={props.ariaLabel}>
        <thead>
          <tr>
            {props.columns.map((col) => (
              <th key={col.key} className={col.numeric ? 'num' : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr
              key={props.rowKey(row)}
              data-clickable={props.onRowClick ? true : undefined}
              onClick={props.onRowClick ? () => props.onRowClick?.(row) : undefined}
              onKeyDown={
                props.onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        props.onRowClick?.(row);
                      }
                    }
                  : undefined
              }
              tabIndex={props.onRowClick ? 0 : undefined}
            >
              {props.columns.map((col) => (
                <td key={col.key} className={col.numeric ? 'num' : col.mono ? 'mono' : undefined}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
