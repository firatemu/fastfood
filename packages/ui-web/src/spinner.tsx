import type { HTMLAttributes } from 'react';

import './styles.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  label?: string;
}

/**
 * Spinner — accessible loading indicator. role=status.
 */
export function Spinner(props: SpinnerProps) {
  const { size = 'md', label = 'Yükleniyor', className, ...rest } = props;
  const classes = ['ff-spinner', `ff-spinner--${size}`, className ?? ''].filter(Boolean).join(' ');
  return (
    <span {...rest} role="status" aria-label={label} className={classes}>
      <span className="ff-spinner__circle" aria-hidden="true" />
    </span>
  );
}
