import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export interface StatGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** compact = 2 cols on md; wide = up to 4 cols on xl */
  layout?: 'compact' | 'wide';
}

/**
 * StatGroup — responsive grid wrapper for KpiCard clusters.
 */
export function StatGroup(props: StatGroupProps) {
  const { children, layout = 'wide', className, ...rest } = props;
  const classes = ['ff-stat-group', `ff-stat-group--${layout}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div {...rest} className={classes} role="group">
      {children}
    </div>
  );
}
