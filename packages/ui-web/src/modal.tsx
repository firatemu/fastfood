import type { ReactNode } from 'react';

import './styles.css';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Optionally a test id for stable targeting. */
  testId?: string;
}

/**
 * Modal — accessible dialog. role=dialog, aria-modal=true.
 * Body must be portal-mounted in real apps; this implementation
 * uses an inline panel for token compliance.
 */
export function Modal(props: ModalProps) {
  const { open, title, onClose, children, footer, testId } = props;
  if (!open) return null;
  return (
    <div className="ff-modal-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ff-modal"
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ff-modal__header">
          <h2 className="ff-modal__title">{title}</h2>
          {onClose ? (
            <button type="button" aria-label="Kapat" className="ff-modal__close" onClick={onClose}>
              ×
            </button>
          ) : null}
        </header>
        <div className="ff-modal__body">{children}</div>
        {footer ? <footer className="ff-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
