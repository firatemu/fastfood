'use client';

import { formatTryMinor } from '../../lib/money';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import type { PaymentSummarySnapshot } from '../../lib/storefront/payment-summary';

import { CartLineCard } from './cart-line-card';

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
    <aside className="bg-surface-container-low rounded-xl p-space-md lg:p-space-lg shadow-xl lg:sticky lg:top-28 flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md uppercase tracking-wide">
          Sipariş Özeti
          {itemCount > 0 ? (
            <span className="text-secondary-container font-headline-sm"> ({itemCount})</span>
          ) : null}
        </h2>
        {snapshot?.branchName ? (
          <span className="font-label-sm text-primary-container uppercase">
            {snapshot.branchName}
          </span>
        ) : null}
      </div>
      {lines.length > 0 ? (
        <div className="flex flex-col gap-space-sm max-h-72 overflow-y-auto">
          {lines.map((line) => (
            <CartLineCard key={line.id} line={line} compact />
          ))}
        </div>
      ) : (
        <p className="font-body-sm text-on-surface-variant">
          Sepet satırları ödeme tutarıyla kilitlendi.
        </p>
      )}
      <div className="flex flex-col gap-2 font-body-sm text-on-surface-variant pt-space-xs">
        {snapshot ? (
          <>
            <div className="flex justify-between">
              <span>Ara Toplam</span>
              <span className="text-on-surface">
                {formatTryMinor(snapshot.merchandiseGrossSubtotalMinor, payCurrency)}
              </span>
            </div>
            {snapshot.cartDiscountTotalMinor && BigInt(snapshot.cartDiscountTotalMinor) > 0n ? (
              <div className="flex justify-between text-primary-container">
                <span>İndirim</span>
                <span>-{formatTryMinor(snapshot.cartDiscountTotalMinor, payCurrency)}</span>
              </div>
            ) : null}
            {snapshot.pickupDiscountMinor && BigInt(snapshot.pickupDiscountMinor) > 0n ? (
              <div className="flex justify-between text-primary-container">
                <span>Gel-al indirimi</span>
                <span>-{formatTryMinor(snapshot.pickupDiscountMinor, payCurrency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span>Teslimat Ücreti</span>
              <span
                className={
                  BigInt(snapshot.deliveryFeeMinor ?? '0') === 0n
                    ? 'text-secondary-container font-semibold'
                    : 'text-on-surface'
                }
              >
                {BigInt(snapshot.deliveryFeeMinor ?? '0') === 0n
                  ? 'ÜCRETSİZ'
                  : formatTryMinor(snapshot.deliveryFeeMinor ?? '0', payCurrency)}
              </span>
            </div>
            {snapshot.tipMinor && BigInt(snapshot.tipMinor) > 0n ? (
              <div className="flex justify-between">
                <span>Kurye Bahşişi</span>
                <span className="text-on-surface">
                  +{formatTryMinor(snapshot.tipMinor, payCurrency)}
                </span>
              </div>
            ) : null}
            {snapshot.loyaltyRedeemedMinor && BigInt(snapshot.loyaltyRedeemedMinor) > 0n ? (
              <div className="flex justify-between text-primary-container">
                <span>{LOYALTY_PROGRAM_NAME}</span>
                <span>-{formatTryMinor(snapshot.loyaltyRedeemedMinor, payCurrency)}</span>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="pt-space-sm flex justify-between items-baseline bg-surface-container-high/40 p-space-md rounded-xl">
          <span className="font-label-sm uppercase text-on-surface-variant tracking-wider">
            Genel Toplam
          </span>
          <span className="font-headline-md text-headline-md text-secondary-container leading-none">
            {formatTryMinor(total, payCurrency)}
          </span>
        </div>
      </div>
    </aside>
  );
}
