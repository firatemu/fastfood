'use client';

import { useEffect, useRef } from 'react';

import { ActionButton } from './ops-ui';

export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (props.open && !node.open) node.showModal();
    if (!props.open && node.open) node.close();
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      className="ops-dialog"
      onClose={props.onCancel}
      aria-labelledby="ops-confirm-title"
    >
      <h2 id="ops-confirm-title">{props.title}</h2>
      <p>{props.body}</p>
      <div className="ops-dialog__actions">
        <ActionButton onClick={props.onCancel} disabled={props.busy}>
          Vazgeç
        </ActionButton>
        <ActionButton
          variant={props.danger ? 'danger' : 'primary'}
          onClick={props.onConfirm}
          disabled={props.busy}
        >
          {props.busy ? 'İşleniyor' : props.confirmLabel}
        </ActionButton>
      </div>
    </dialog>
  );
}
