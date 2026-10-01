import type { ReactNode } from 'react';

import './styles.css';

export interface MetricProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

/**
 * Metric — compact inline metric for toolbars / detail headers.
 * Prefer KpiCard for dashboard tiles.
 */
export function Metric(props: MetricProps) {
  const { label, value, hint } = props;
  return (
    <div className="ff-metric">
      <dt className="ff-metric__label">{label}</dt>
      <dd className="ff-metric__value">{value}</dd>
      {hint ? <p className="ff-metric__hint">{hint}</p> : null}
    </div>
  );
}

export interface MetricGroupProps {
  children: ReactNode;
  ariaLabel?: string;
}

export function MetricGroup(props: MetricGroupProps) {
  const { children, ariaLabel = 'Metrikler' } = props;
  return (
    <dl className="ff-metric-group" aria-label={ariaLabel}>
      {children}
    </dl>
  );
}
