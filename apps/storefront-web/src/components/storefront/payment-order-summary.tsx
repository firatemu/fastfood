'use client';

import { formatTryMinor } from '../../lib/money';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import type { PaymentSummarySnapshot } from '../../lib/storefront/payment-summary';

import { CartLineCard } from './cart-line-card';
import { MaterialIcon } from './material-icon';

export function PaymentOrderSummary({
  snapshot,
  amountMinor,
  currency,
}: {
  snapshot: PaymentSummarySnapshot | null;
  amountMinor: string;
  currency: string;
}) {
  const lines = snapshot?.lines ?? [];
  const payCurrency = snapshot?.currency ?? currency;
  const total = snapshot?.finalPayableMinor ?? amountMinor;
  const itemCount = lines.reduce((n, line) => n + line.quantity, 0);

  return (
    <aside className="bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.45)] lg:sticky lg:top-24 flex flex-col gap-4 relative overflow-hidden">
      {/* Ambient golden corner glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
        <h2 className="font-anton text-lg sm:text-xl uppercase text-white tracking-wide flex items-center gap-2">
          Sipariş Özeti
          {itemCount > 0 ? (
            <span className="text-amber-400 font-anton text-sm">({itemCount} Ürün)</span>
          ) : null}
        </h2>
        {snapshot?.branchName ? (
          <span className="font-anton text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
            {snapshot.branchName}
          </span>
        ) : null}
      </div>

      {lines.length > 0 ? (
        <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
          {lines.map((line) => (
            <CartLineCard key={line.id} line={line} compact />
          ))}
        </div>
      ) : (
        <p className="font-sans text-xs text-neutral-400 py-2">
          Sepet satırları ödeme tutarıyla eşleşti.
        </p>
      )}

      <div className="flex flex-col gap-2 font-sans text-xs sm:text-sm text-neutral-300 pt-3 border-t border-white/[0.06]">
        {snapshot ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Ara Toplam</span>
              <span className="text-white font-medium">
                {formatTryMinor(snapshot.merchandiseGrossSubtotalMinor, payCurrency)}
              </span>
            </div>

            {snapshot.cartDiscountTotalMinor && BigInt(snapshot.cartDiscountTotalMinor) > 0n ? (
              <div className="flex justify-between items-center text-amber-400">
                <span>İndirim</span>
                <span className="font-semibold">
                  -{formatTryMinor(snapshot.cartDiscountTotalMinor, payCurrency)}
                </span>
              </div>
            ) : null}

            {snapshot.pickupDiscountMinor && BigInt(snapshot.pickupDiscountMinor) > 0n ? (
              <div className="flex justify-between items-center text-amber-400">
                <span>Gel-Al İndirimi (%10)</span>
                <span className="font-semibold">
                  -{formatTryMinor(snapshot.pickupDiscountMinor, payCurrency)}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Teslimat Ücreti</span>
              <span
                className={
                  BigInt(snapshot.deliveryFeeMinor ?? '0') === 0n
                    ? 'text-emerald-400 font-bold uppercase tracking-wider text-xs'
                    : 'text-white font-medium'
                }
              >
                {BigInt(snapshot.deliveryFeeMinor ?? '0') === 0n
                  ? 'ÜCRETSİZ'
                  : formatTryMinor(snapshot.deliveryFeeMinor ?? '0', payCurrency)}
              </span>
            </div>

            {snapshot.tipMinor && BigInt(snapshot.tipMinor) > 0n ? (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Kurye Bahşişi</span>
                <span className="text-amber-400 font-medium">
                  +{formatTryMinor(snapshot.tipMinor, payCurrency)}
                </span>
              </div>
            ) : null}

            {snapshot.loyaltyRedeemedMinor && BigInt(snapshot.loyaltyRedeemedMinor) > 0n ? (
              <div className="flex justify-between items-center text-amber-400">
                <span>{LOYALTY_PROGRAM_NAME}</span>
                <span className="font-semibold">
                  -{formatTryMinor(snapshot.loyaltyRedeemedMinor, payCurrency)}
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="pt-3.5 mt-1 border-t border-white/[0.08] flex justify-between items-baseline">
          <span className="font-anton text-base uppercase text-white tracking-wide">
            Toplam Tutar
          </span>
          <div className="text-right">
            <span className="font-anton text-2xl sm:text-3xl text-amber-400 font-bold leading-none drop-shadow-[0_2px_12px_rgba(254,179,0,0.25)]">
              {formatTryMinor(total, payCurrency)}
            </span>
            <span className="block font-sans text-[10px] text-neutral-400 mt-1 uppercase tracking-wider">
              KDV Dahildir
            </span>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.06] flex items-center gap-2.5 text-xs text-neutral-400 mt-1">
        <MaterialIcon name="verified_user" className="text-amber-400 text-base shrink-0" filled />
        <span>iyzico altyapısıyla 3D Secure doğrulamalı güvenli işlem.</span>
      </div>
    </aside>
  );
}
