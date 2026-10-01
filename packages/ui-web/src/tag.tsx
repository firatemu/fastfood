import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export type TagVariant = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * Tag — compact filter/chip label; optional dismiss for active filters.
 */
export function Tag(props: TagProps) {
  const {
    variant = 'neutral',
    className,
    children,
    onRemove,
    removeLabel = 'Kaldır',
    ...rest
  } = props;
  const classes = ['ff-tag', `ff-tag--${variant}`, className ?? ''].filter(Boolean).join(' ');
  return (
    <span {...rest} className={classes}>
      <span className="ff-tag__label">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="ff-tag__remove"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
