import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

/**
 * Badge — small label for status / count.
 */
export function Badge(props: BadgeProps) {
  const { variant = 'neutral', className, children, ...rest } = props;
  const classes = ['ff-badge', `ff-badge--${variant}`, className ?? ''].filter(Boolean).join(' ');
  return (
    <span {...rest} className={classes}>
      {children}
    </span>
  );
}
