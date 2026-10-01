import type { ReactNode } from 'react';

import './styles.css';

export interface TooltipProps {
  label: string;
  children: ReactNode;
}

/**
 * Tooltip — title-only accessible hint. Uses the title attribute
 * plus a styled wrapper. Full implementation should swap to a
 * focus/hover-aware popover in real apps.
 */
export function Tooltip(props: TooltipProps) {
  const { label, children } = props;
  return (
    <span className="ff-tooltip" title={label} aria-label={label}>
      {children}
    </span>
  );
}
