import type { ReactNode } from 'react';

import './styles.css';

export interface BulkActionBarProps {
  selectedCount: number;
  totalLabel?: string;
  children: ReactNode;
  onClear?: () => void;
}

/**
 * BulkActionBar — selection summary + bulk actions for tables.
 */
export function BulkActionBar(props: BulkActionBarProps) {
  const { selectedCount, totalLabel, children, onClear } = props;
  if (selectedCount <= 0) return null;
  return (
    <div className="ff-bulk-action-bar" role="status" aria-live="polite">
      <span className="ff-bulk-action-bar__count">
        {selectedCount} seçili{totalLabel ? ` / ${totalLabel}` : ''}
      </span>
      <div className="ff-bulk-action-bar__actions">{children}</div>
      {onClear ? (
        <button type="button" className="ff-bulk-action-bar__clear" onClick={onClear}>
          Temizle
        </button>
      ) : null}
    </div>
  );
}
