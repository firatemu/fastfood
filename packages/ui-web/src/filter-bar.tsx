import type { ReactNode } from 'react';

import './styles.css';

export interface FilterBarProps {
  children: ReactNode;
  actions?: ReactNode;
  /** Shown when filters are active (e.g. chip count). */
  summary?: ReactNode;
  ariaLabel?: string;
}

/**
 * FilterBar — horizontal filter/search cluster for list screens.
 */
export function FilterBar(props: FilterBarProps) {
  const { children, actions, summary, ariaLabel = 'Filtreler' } = props;
  return (
    <div className="ff-filter-bar" role="search" aria-label={ariaLabel}>
      <div className="ff-filter-bar__filters">{children}</div>
      {summary ? <div className="ff-filter-bar__summary">{summary}</div> : null}
      {actions ? <div className="ff-filter-bar__actions">{actions}</div> : null}
    </div>
  );
}
