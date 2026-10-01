import type { HTMLAttributes } from 'react';

import './styles.css';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number;
  label?: string;
  /** Show numeric label beside the bar. */
  showValue?: boolean;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

/**
 * Progress — determinate progress bar for Ops workloads / uploads.
 */
export function Progress(props: ProgressProps) {
  const {
    value,
    label = 'İlerleme',
    showValue = false,
    tone = 'primary',
    size = 'md',
    className,
    ...rest
  } = props;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const classes = ['ff-progress', `ff-progress--${tone}`, `ff-progress--${size}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div {...rest} className={classes}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className="ff-progress__track"
      >
        <div className="ff-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
      {showValue ? <span className="ff-progress__value">{Math.round(clamped)}%</span> : null}
    </div>
  );
}
