import type { HTMLAttributes } from 'react';

import './styles.css';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual width token — number of 4px grid units. */
  widthUnits?: number;
  heightUnits?: number;
  circle?: boolean;
}

/**
 * Skeleton — loading placeholder. aria-hidden so it is invisible to AT.
 */
export function Skeleton(props: SkeletonProps) {
  const { widthUnits = 16, heightUnits = 2, circle = false, className, ...rest } = props;
  const style = {
    width: `calc(${widthUnits} * var(--space-1))`,
    height: `calc(${heightUnits} * var(--space-1))`,
    borderRadius: circle ? '9999px' : undefined,
  };
  const classes = ['ff-skeleton', className ?? ''].filter(Boolean).join(' ');
  return <div {...rest} aria-hidden="true" className={classes} style={style} />;
}
