'use client';

import { useState } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  busy,
  danger,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="ops-confirm-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ops-confirm-panel">
        <header>
          <h3>{title}</h3>
          <button
            type="button"
            className="ops-btn ops-btn--ghost"
            onClick={onCancel}
            disabled={busy}
            aria-label="Kapat"
          >
            ✕
          </button>
        </header>
        <p>{body}</p>
        <footer>
          <button
            type="button"
            className="ops-btn ops-btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'ops-btn ops-btn--danger' : 'ops-btn ops-btn--primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

export interface UseConfirmAction {
  isOpen: boolean;
  confirmKind: ConfirmKind | null;
  open: (kind: ConfirmKind) => void;
  close: () => void;
}

export type ConfirmKind = 'cancel' | 'refund' | 'reassign' | 'courier' | null;

export function useConfirm(): UseConfirmAction {
  const [state, setState] = useState<ConfirmKind>(null);
  return {
    isOpen: state !== null,
    confirmKind: state,
    open: setState,
    close: () => setState(null),
  };
}
