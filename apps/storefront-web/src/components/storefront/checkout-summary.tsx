import Link from 'next/link';
import type { z } from 'zod';

import { formatTryMinor } from '../../lib/money';
import type { checkoutQuoteSchema } from '../../lib/schemas';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import type { Cart } from '../../lib/storefront/cart';

import { CartLineCard } from './cart-line-card';
import { CouponForm, type CouponStatus } from './coupon-form';
import { MaterialIcon } from './material-icon';

type Quote = z.infer<typeof checkoutQuoteSchema>;

export function CheckoutSummary({
  lines,
  quote,
  quoteLoading,
  couponCode,
  onCouponCode,
  couponStatus,
  couponMessage,
  onApplyCoupon,
  onPay,
  paying,
  payDisabled,
  loyaltyPoints,
  useLoyalty,
  onUseLoyalty,
}: {
  lines: Cart['lineItems'];
  quote: Quote | null;
  quoteLoading: boolean;
  couponCode: string;
  onCouponCode: (value: string) => void;
  couponStatus: CouponStatus;
  couponMessage: string | null;
  onApplyCoupon: () => void;
  onPay: () => void;
  paying: boolean;
  payDisabled: boolean;
  loyaltyPoints: string | null;
  useLoyalty: boolean;
  onUseLoyalty: (value: boolean) => void;
}) {
  const currency = quote?.currency ?? lines[0]?.currencySnapshot ?? 'TRY';
  const total = quote?.finalPayableMinor ?? '0';
  return (
    <div className="bg-surface-container-low p-space-md lg:p-space-lg rounded-xl shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between pb-space-sm mb-space-sm">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface tracking-wide">
          Sipariş Özeti{' '}
          <span className="text-secondary-container font-headline-sm">({lines.length} Ürün)</span>
        </h2>
        {quote?.branchName ? (
          <span className="font-label-sm text-primary-container uppercase">{quote.branchName}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-space-sm max-h-72 overflow-y-auto">
        {lines.map((line) => (
          <CartLineCard key={line.id} line={line} compact />
        ))}
      </div>
      <div className="mt-space-sm pt-space-sm">
        <CouponForm
          code={couponCode}
          onCodeChange={onCouponCode}
          status={couponStatus}
          message={couponMessage}
          onApply={onApplyCoupon}
        />
      </div>
      {loyaltyPoints && BigInt(loyaltyPoints) > 0n ? (
        <label className="mt-space-sm flex items-center justify-between gap-2 font-body-sm">
          <span>{LOYALTY_PROGRAM_NAME} puan kullan ({loyaltyPoints})</span>
          <input
            type="checkbox"
            className="accent-secondary-container"
            checked={useLoyalty}
            onChange={(event) => onUseLoyalty(event.target.checked)}
            data-ff-loyalty
          />
        </label>
      ) : null}
      <div className="mt-space-sm pt-space-sm flex flex-col gap-2 font-body-sm text-on-surface-variant">
        <div className="flex justify-between">
          <span>Ara Toplam</span>
          <span className="text-on-surface">
            {formatTryMinor(quote?.merchandiseGrossSubtotalMinor ?? '0', currency)}
          </span>
        </div>
        {quote && BigInt(quote.cartDiscountTotalMinor) > 0n ? (
          <div className="flex justify-between text-primary-container">
            <span>İndirim</span>
            <span>-{formatTryMinor(quote.cartDiscountTotalMinor, currency)}</span>
          </div>
        ) : null}
        {quote && BigInt(quote.pickupDiscountMinor ?? '0') > 0n ? (
          <div className="flex justify-between text-primary-container">
            <span>Gel-al indirimi</span>
            <span>-{formatTryMinor(quote.pickupDiscountMinor ?? '0', currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Teslimat Ücreti</span>
          <span className={BigInt(quote?.deliveryFeeMinor ?? '0') === 0n ? 'text-primary-container font-semibold' : 'text-on-surface'}>
            {BigInt(quote?.deliveryFeeMinor ?? '0') === 0n
              ? 'ÜCRETSİZ'
              : formatTryMinor(quote?.deliveryFeeMinor ?? '0', currency)}
          </span>
        </div>
        {quote && BigInt(quote.tipMinor ?? '0') > 0n ? (
          <div className="flex justify-between">
            <span>Kurye Bahşişi</span>
            <span className="text-on-surface">+{formatTryMinor(quote.tipMinor ?? '0', currency)}</span>
          </div>
        ) : null}
        {quote && BigInt(quote.loyaltyRedeemedMinor) > 0n ? (
          <div className="flex justify-between text-primary-container">
            <span>{LOYALTY_PROGRAM_NAME}</span>
            <span>-{formatTryMinor(quote.loyaltyRedeemedMinor, currency)}</span>
          </div>
        ) : null}
        <div className="pt-3 mt-1 flex justify-between items-baseline">
          <span className="font-headline-md text-headline-md uppercase text-on-surface">Toplam Tutar</span>
          <div className="text-right">
            <span className="font-headline-lg text-headline-lg text-secondary-container leading-none">
              {quoteLoading ? '…' : formatTryMinor(total, currency)}
            </span>
            <span className="block font-label-sm text-[10px] text-on-surface-variant mt-0.5">KDV Dahildir</span>
          </div>
        </div>
      </div>
      {quote && !quote.minimumOrderEligible ? (
        <p className="mt-space-sm font-body-sm text-error">Minimum sipariş tutarı karşılanmadı.</p>
      ) : null}
      <p className="mt-space-sm font-body-sm text-[11px] text-on-surface-variant/80 text-center leading-normal">
        Siparişi onaylayarak{' '}
        <Link
          href="/on-bilgilendirme-formu"
          target="_blank"
          className="underline text-primary hover:text-on-surface"
        >
          Ön Bilgilendirme Koşulları
        </Link>
        &apos;nı ve{' '}
        <Link
          href="/mesafeli-satis-sozlesmesi"
          target="_blank"
          className="underline text-primary hover:text-on-surface"
        >
          Mesafeli Satış Sözleşmesi
        </Link>
        &apos;ni okuduğunuzu ve kabul ettiğinizi teyit edersiniz.
      </p>
      <button
        className="w-full mt-space-md py-4 rounded-lg bg-secondary-container hover:brightness-110 text-on-secondary-container font-label-lg uppercase tracking-wider shadow-md flex items-center justify-center gap-2 disabled:opacity-40"
        type="button"
        onClick={onPay}
        disabled={payDisabled || paying}
        data-ff-pay
      >
        <MaterialIcon name="shopping_cart_checkout" className="text-xl" />
        <span>
          {paying ? 'Ödeme başlatılıyor' : `Siparişi Onayla • ${formatTryMinor(total, currency)}`}
        </span>
      </button>
      <a
        href="/account/support"
        className="mt-space-sm flex items-center justify-between p-3 rounded-xl bg-surface-container text-on-surface-variant"
        data-ff-support-entry="checkout"
      >
        <span className="font-body-sm">Kadıköy mutfak şefi canlı hatta</span>
        <span className="font-label-sm uppercase text-secondary-container">Canlı Destek</span>
      </a>
    </div>
  );
}
