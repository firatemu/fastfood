'use client';

import type { QrMenuBranch } from '../lib/types';

interface MenuTopbarProps {
  branch: QrMenuBranch;
  query: string;
  resultCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MenuTopbar({
  branch,
  query,
  resultCount,
  totalCount,
  onQueryChange,
}: MenuTopbarProps) {
  const isSearching = query.trim().length > 0;

  return (
    <header className="qr-no-print sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="qr-display shrink-0 rounded-md bg-ink px-2.5 py-1.5 text-lg text-brand">
              BURGER HOME
            </span>
            <span className="hidden h-6 w-px bg-line sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{branch.name}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-ink-soft">
                <span
                  aria-hidden
                  className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    branch.isAcceptingOrders ? 'bg-flame' : 'bg-ink-faint'
                  }`}
                />
                {branch.isAcceptingOrders ? 'Sipariş alınıyor' : 'Sipariş alınmıyor'}
                {branch.addressLine ? <span className="hidden sm:inline"> · {branch.addressLine}</span> : null}
              </p>
            </div>
          </div>

          <p className="qr-numeric hidden shrink-0 text-right text-xs leading-tight text-ink-soft sm:block">
            <span className="block text-base font-bold text-ink">{totalCount}</span>
            ürün
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-faint">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Menüde ara — ürün veya içerik"
              aria-label="Menüde ara"
              data-qr-search
              className="w-full rounded-pill border border-line bg-shell py-2.5 pr-10 pl-11 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:bg-paper focus:outline-none"
            />
            {isSearching ? (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Aramayı temizle"
                data-qr-search-clear
                className="absolute inset-y-0 right-2.5 flex items-center rounded-full p-1 text-ink-soft transition hover:bg-line hover:text-ink"
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>

          <p className="qr-numeric shrink-0 text-xs text-ink-soft sm:hidden">
            <span className="font-bold text-ink">{totalCount}</span> ürün
          </p>
        </div>

        {isSearching ? (
          <p role="status" data-qr-result-count className="qr-numeric mt-2 text-xs text-ink-soft">
            <span className="font-bold text-ink">{resultCount}</span> / {totalCount} ürün listeleniyor
          </p>
        ) : null}
      </div>
    </header>
  );
}