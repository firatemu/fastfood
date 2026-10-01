import type { ReactNode } from 'react';

import './styles.css';

export type InlineAlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface InlineAlertProps {
  variant?: InlineAlertVariant;
  title?: string;
  children: ReactNode;
}

/**
 * InlineAlert — compact contextual message within forms/detail panels.
 */
export function InlineAlert(props: InlineAlertProps) {
  const { variant = 'info', title, children } = props;
  return (
    <div className={`ff-inline-alert ff-inline-alert--${variant}`} role="status">
      {title ? <p className="ff-inline-alert__title">{title}</p> : null}
      <div className="ff-inline-alert__body">{children}</div>
    </div>
  );
}
