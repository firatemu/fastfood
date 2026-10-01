import type { ReactNode } from 'react';

import './styles.css';

export interface DrawerProps {
  open: boolean;
  title: string;
  side?: 'left' | 'right';
  onClose?: () => void;
  children: ReactNode;
}

/**
 * Drawer (Sheet) — slide-in panel. role=dialog.
 */
export function Drawer(props: DrawerProps) {
  const { open, title, side = 'right', onClose, children } = props;
  if (!open) return null;
  return (
    <div className="ff-drawer-overlay" onClick={onClose} role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`ff-drawer ff-drawer--${side}`}
      >
        <header className="ff-drawer__header">
          <h2 className="ff-drawer__title">{title}</h2>
          {onClose ? (
            <button type="button" aria-label="Kapat" className="ff-drawer__close" onClick={onClose}>
              ×
            </button>
          ) : null}
        </header>
        <div className="ff-drawer__body">{children}</div>
      </aside>
    </div>
  );
}
