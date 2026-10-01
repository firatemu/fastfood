import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

/**
 * Alert — accessible callout. role=alert for live-region announcements.
 */
export function Alert(props: AlertProps) {
  const { variant = 'info', title, className, children, ...rest } = props;
  const classes = ['ff-alert', `ff-alert--${variant}`, className ?? ''].filter(Boolean).join(' ');
  return (
    <div {...rest} role="alert" className={classes}>
      {title ? <p className="ff-alert__title">{title}</p> : null}
      <div className="ff-alert__body">{children}</div>
    </div>
  );
}
