'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import { formatDeltaMinor, formatTryMinor } from '../lib/format';
import type { QrMenuProduct } from '../lib/types';

interface ProductDetailSheetProps {
  product: QrMenuProduct | null;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[11px] font-bold tracking-[0.14em] text-ink-faint uppercase">
        {children}
      </h3>
      {hint ? <span className="text-[11px] text-ink-faint">{hint}</span> : null}
    </div>
  );
}

export function ProductDetailSheet({ product, onClose }: ProductDetailSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!product) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div className="qr-no-print fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button
        type="button"
        aria-label="Ürün detayını kapat"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-detail-title"
        data-qr-detail={product.slug}
        className="qr-sheet-in relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[1.5rem] border border-line bg-paper shadow-float sm:max-h-none sm:w-[30rem] sm:max-w-[30rem] sm:rounded-none sm:rounded-l-[1.5rem] sm:border-y-0 sm:border-r-0"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
              {product.categoryName}
            </p>
            <h2 id="qr-detail-title" className="qr-display mt-1 text-2xl leading-tight text-ink">
              {product.name}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            data-qr-detail-close
            className="shrink-0 rounded-pill border border-line p-2 text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {product.imageUrl ? (
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-tile bg-shell">
              <Image
                src={product.imageUrl}
                alt={product.imageAlt ?? product.name}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className="object-cover"
              />
            </div>
          ) : null}

          {product.description ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{product.description}</p>
          ) : null}

          {product.variants.length > 0 ? (
            <section className="mt-6">
              <SectionTitle hint="gramaj">Porsiyon</SectionTitle>
              <ul className="mt-2 flex flex-col gap-2">
                {product.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-center justify-between gap-4 rounded-tile border border-line bg-shell px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-ink">{variant.name}</span>
                    <span className="qr-numeric shrink-0 text-sm font-bold text-ink">
                      {formatTryMinor(variant.priceMinor, product.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.modifierGroups.length > 0 ? (
            <section className="mt-6">
              <SectionTitle>Lütfen ekstra tercihinizi garsonumuzla belirtiniz</SectionTitle>
              <div className="mt-2 flex flex-col gap-4">
                {product.modifierGroups.map((group) => (
                  <div key={group.id} data-qr-modifier-group={group.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-bold text-ink">{group.name}</p>
                      <p className="qr-numeric shrink-0 text-[11px] text-ink-faint">
                        {group.selectionMin > 0
                          ? `${group.selectionMin} seçim zorunlu`
                          : `en fazla ${group.selectionMax}`}
                      </p>
                    </div>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {group.modifiers.map((modifier) => (
                        <li
                          key={modifier.id}
                          className="flex items-center justify-between gap-4 border-b border-dashed border-line py-2 last:border-b-0"
                        >
                          <span className="text-[13px] text-ink-soft">{modifier.name}</span>
                          <span className="qr-numeric shrink-0 text-[13px] font-semibold text-ink">
                            {formatDeltaMinor(modifier.priceDeltaMinor, product.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {product.removalOptions.length > 0 ? (
            <section className="mt-6">
              <SectionTitle hint="garsonumuza söyleyin">İstediğiniz malzeme çıkarılabilir</SectionTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.removalOptions.map((option) => (
                  <span
                    key={option.id}
                    className="rounded-pill border border-line bg-paper px-3 py-1 text-xs text-ink-soft"
                  >
                    {option.name}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
            Fiyatlar KDV dahildir. Alerjen bilgisi için garsonumuza danışabilirsiniz.
          </p>
        </div>
      </aside>
    </div>
  );
}