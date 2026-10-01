import type { ReactNode } from 'react';

import './styles.css';

export interface PopoverProps {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: ReactNode;
}

/**
 * Popover — small floating panel. role=dialog.
 */
export function Popover(props: PopoverProps) {
  const { open, title, onClose, children } = props;
  if (!open) return null;
  return (
    <div role="dialog" aria-label={title} className="ff-popover">
      {title ? <p className="ff-popover__title">{title}</p> : null}
      <div className="ff-popover__body">{children}</div>
      {onClose ? (
        <button type="button" aria-label="Kapat" className="ff-popover__close" onClick={onClose}>
          ×
        </button>
      ) : null}
    </div>
  );
}
