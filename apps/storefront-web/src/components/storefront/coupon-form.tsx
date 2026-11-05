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
        className="flex items-center bg-[#0d1017] border border-white/10 rounded-xl p-1.5 focus-within:border-amber-400/50 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all shadow-inner"
        onSubmit={submit}
      >
        <MaterialIcon name="sell" className="text-amber-400/80 ml-2 text-base" />
        <input
          className="w-full bg-transparent px-2.5 py-1.5 font-label-sm text-xs text-white uppercase outline-none placeholder:text-neutral-500 font-semibold tracking-wider"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          placeholder="İndirim Kodu Girin"
          aria-label="İndirim kodu"
          autoComplete="off"
        />
        <button
          className="px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-amber-400 hover:text-neutral-950 text-amber-400 font-anton text-sm tracking-wider uppercase transition-all disabled:opacity-40 disabled:hover:bg-white/[0.08] disabled:hover:text-amber-400 cursor-pointer"
          type="submit"
          disabled={status === 'validating' || code.trim().length === 0}
        >
          {status === 'validating' ? '…' : applied ? 'Uygulandı' : 'Uygula'}
        </button>
      </form>
      {message ? (
        <div
          className={`flex items-center gap-1.5 text-xs font-body-sm pl-1 ${
            applied ? 'text-amber-400' : 'text-red-400'
          }`}
        >
          <MaterialIcon name={applied ? 'check_circle' : 'error'} className="text-sm" />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
