import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  onDismiss?: () => void;
}

/**
 * Toast — non-blocking notification. role=status for non-error, role=alert for danger.
 */
export function Toast(props: ToastProps) {
  const { variant = 'info', title, description, action, onDismiss, className, ...rest } = props;
  const classes = ['ff-toast', `ff-toast--${variant}`, className ?? ''].filter(Boolean).join(' ');
  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';
  return (
    <div {...rest} role={role} className={classes}>
      <div className="ff-toast__body">
        <p className="ff-toast__title">{title}</p>
        {description ? <p className="ff-toast__desc">{description}</p> : null}
      </div>
      {action ? <div className="ff-toast__action">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          className="ff-toast__dismiss"
          aria-label="Bildirimi kapat"
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
