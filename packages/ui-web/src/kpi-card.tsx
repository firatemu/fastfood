import type { ReactNode } from 'react';

import './styles.css';

export type KpiCardTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export interface KpiCardTrend {
  direction: 'up' | 'down' | 'flat';
  label: string;
}

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: KpiCardTrend;
  tone?: KpiCardTone;
  loading?: boolean;
  testId?: string;
}

/**
 * KpiCard — dense operational metric tile for dashboard/report summaries.
 */
export function KpiCard(props: KpiCardProps) {
  const { label, value, hint, trend, tone = 'neutral', loading = false, testId } = props;
  const trendClass =
    trend?.direction === 'up'
      ? 'ff-kpi-card__trend--up'
      : trend?.direction === 'down'
        ? 'ff-kpi-card__trend--down'
        : 'ff-kpi-card__trend--flat';

  return (
    <article
      className={`ff-kpi-card ff-kpi-card--${tone}${loading ? ' ff-kpi-card--loading' : ''}`}
      data-testid={testId}
      aria-busy={loading}
    >
      <p className="ff-kpi-card__label">{label}</p>
      <p className="ff-kpi-card__value">{loading ? '—' : value}</p>
      {hint ? <p className="ff-kpi-card__hint">{hint}</p> : null}
      {trend && !loading ? (
        <p className={`ff-kpi-card__trend ${trendClass}`} aria-label={`Trend: ${trend.label}`}>
          {trend.label}
        </p>
      ) : null}
    </article>
  );
}
