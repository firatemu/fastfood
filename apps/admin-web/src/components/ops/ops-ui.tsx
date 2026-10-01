import type { ReactNode } from 'react';

import { formatSyncAge } from '../../lib/ops-time';
import type { StatusTone } from '../../lib/order-status';

export function StatusBadge({ tone, children }: { tone: StatusTone; children: string }) {
  return <span className={`ops-badge ops-badge--${tone}`}>{children}</span>;
}

export function ActionButton(props: {
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
}) {
  const { children, onClick, disabled, variant = 'ghost', type = 'button' } = props;
  return (
    <button type={type} className={`ops-btn ops-btn--${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function KeylineCard(props: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="ops-card">
      <header className="ops-card__head">
        <h2 className="ops-card__title">{props.title}</h2>
        {props.actions}
      </header>
      <div className="ops-card__body">{props.children}</div>
    </section>
  );
}

export function OperationalMetric(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="ops-metric">
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
      {props.hint ? <p className="ops-metric__hint">{props.hint}</p> : null}
    </div>
  );
}

export function SyncIndicator(props: {
  lastSyncAt: number | null;
  stale?: boolean;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const age = formatSyncAge(props.lastSyncAt);
  return (
    <div className="ops-sync" role="status">
      <span className="ops-sync__meta">
        <span className="material-symbols-outlined" aria-hidden="true">
          schedule
        </span>
        <span>
          {props.stale ? 'Son senkron başarısız · ' : 'Son güncelleme: '}
          {age}
        </span>
      </span>
      <ActionButton onClick={props.onRefresh} disabled={props.refreshing}>
        {props.refreshing ? 'Yenileniyor' : 'Yenile'}
      </ActionButton>
    </div>
  );
}

export function OpsLoading({ title = 'Yükleniyor', description = 'Veriler getiriliyor…' }: { title?: string; description?: string }) {
  return (
    <div className="ops-state" role="status">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function OpsEmpty(props: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="ops-state">
      <h2>{props.title}</h2>
      {props.description ? <p>{props.description}</p> : null}
      {props.action}
    </div>
  );
}

export function OpsError(props: { title?: string; description: string; onRetry?: () => void }) {
  return (
    <div className="ops-state" role="alert">
      <h2>{props.title ?? 'Veri alınamadı'}</h2>
      <p>{props.description}</p>
      {props.onRetry ? (
        <ActionButton variant="primary" onClick={props.onRetry}>
          Tekrar dene
        </ActionButton>
      ) : null}
    </div>
  );
}
