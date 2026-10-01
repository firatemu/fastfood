import type { ReactNode } from 'react';

import { Button } from './button.js';
import { Modal } from './modal.js';
import './styles.css';

export interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
}

/**
 * ConfirmationDialog — destructive/sensitive action guard.
 */
export function ConfirmationDialog(props: ConfirmationDialogProps) {
  const {
    open,
    title,
    description,
    confirmLabel = 'Onayla',
    cancelLabel = 'Vazgeç',
    destructive = false,
    loading = false,
    onConfirm,
    onCancel,
    testId,
  } = props;
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      testId={testId}
      footer={
        <div className="ff-confirmation-dialog__footer">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="ff-confirmation-dialog__body">{description}</div>
    </Modal>
  );
}
