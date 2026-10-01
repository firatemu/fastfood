import type { ReactNode } from 'react';

import './styles.css';

export interface TableToolbarProps {
  leading?: ReactNode;
  trailing?: ReactNode;
  bulk?: ReactNode;
  ariaLabel?: string;
}

/**
 * TableToolbar — chrome above DataTable (search, filters, actions, bulk).
 */
export function TableToolbar(props: TableToolbarProps) {
  const { leading, trailing, bulk, ariaLabel = 'Tablo araç çubuğu' } = props;
  if (!leading && !trailing && !bulk) return null;
  return (
    <div className="ff-table-toolbar" aria-label={ariaLabel}>
      {bulk ? <div className="ff-table-toolbar__bulk">{bulk}</div> : null}
      <div className="ff-table-toolbar__row">
        {leading ? <div className="ff-table-toolbar__leading">{leading}</div> : null}
        {trailing ? <div className="ff-table-toolbar__trailing">{trailing}</div> : null}
      </div>
    </div>
  );
}
