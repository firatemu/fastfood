'use client';

import type { ReactNode } from 'react';

import type { OperationalTableColumn } from './ops-table';
import { OperationalTable } from './ops-table';

export interface PremiumTableProps<T> {
  ariaLabel: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: OperationalTableColumn<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggle?: (row: T) => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
}

export function PremiumTable<T>(props: PremiumTableProps<T>) {
  return (
    <div className="ops-table-wrap ops-table-wrap--premium">
      {props.toolbar ? <div className="ops-premium-table__toolbar">{props.toolbar}</div> : null}
      <OperationalTable<T>
        ariaLabel={props.ariaLabel}
        rows={props.rows}
        rowKey={props.rowKey}
        onRowClick={props.onRowClick}
        columns={
          props.selectable && props.onToggle
            ? [
                {
                  key: 'select',
                  header: '',
                  render: (row) => (
                    <input
                      type="checkbox"
                      aria-label="Siparişi seç"
                      checked={props.selectedIds?.has(props.rowKey(row)) ?? false}
                      onChange={(event) => {
                        event.stopPropagation();
                        props.onToggle?.(row);
                      }}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ),
                },
                ...props.columns,
              ]
            : props.columns
        }
      />
      {props.footer ? <div className="ops-premium-table__footer">{props.footer}</div> : null}
    </div>
  );
}
