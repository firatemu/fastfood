'use client';

import { type FormEvent } from 'react';

import type { CouponStatus } from '../../lib/storefront/promotions';

import { MaterialIcon } from './material-icon';

export type { CouponStatus };

export function CouponForm({
  code,
  onCodeChange,
  status,
  message,
  onApply,
}: {
  code: string;
  onCodeChange: (value: string) => void;
  status: CouponStatus;
  message: string | null;
  onApply: () => void;
}) {
  const applied = status === 'valid';

  function submit(event: FormEvent) {
    event.preventDefault();
    onApply();
  }

  return (
    <div className="flex flex-col gap-1.5 pt-space-xs">
      <form
        className="flex items-center bg-surface-container-lowest rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-primary-container transition-all"
        onSubmit={submit}
      >
        <MaterialIcon name="sell" className="text-outline ml-2 text-base" />
        <input
          className="w-full bg-transparent px-2 py-1 font-label-sm text-label-sm text-on-surface uppercase outline-none"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          placeholder="İndirim Kodu Girin"
          aria-label="İndirim kodu"
          autoComplete="off"
        />
        <button
          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-secondary font-label-sm text-label-sm uppercase transition-colors disabled:opacity-50"
          type="submit"
          disabled={status === 'validating' || code.trim().length === 0}
        >
          {status === 'validating' ? '…' : applied ? 'Uygulandı' : 'Uygula'}
        </button>
      </form>
      {message ? (
        <div
          className={`flex items-center gap-1 text-[11px] font-body-sm pl-1 ${
            applied ? 'text-secondary-container' : 'text-error'
          }`}
        >
          <MaterialIcon name={applied ? 'check_circle' : 'error'} className="text-xs" />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
