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
    <div className="bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.45)] relative overflow-hidden">
      {/* Ambient golden glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08]">
        <h2 className="font-anton text-lg sm:text-xl uppercase text-white tracking-wide flex items-center gap-2">
          Sipariş Özeti{' '}
          <span className="text-amber-400 font-anton text-sm">({lines.length} Ürün)</span>
        </h2>
        {quote?.branchName ? (
          <span className="font-anton text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
            {quote.branchName}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
        {lines.map((line) => (
          <CartLineCard key={line.id} line={line} compact />
        ))}
      </div>

      <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
        <CouponForm
          code={couponCode}
          onCodeChange={onCouponCode}
          status={couponStatus}
          message={couponMessage}
          onApply={onApplyCoupon}
        />
      </div>

      {loyaltyPoints && BigInt(loyaltyPoints) > 0n ? (
        <label className="mt-3 flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0e111a]/90 border border-white/[0.08] cursor-pointer hover:border-amber-400/40 transition-all">
          <div className="flex items-center gap-2">
            <MaterialIcon name="stars" className="text-amber-400 text-lg" filled />
            <span className="font-sans text-xs sm:text-sm text-neutral-200">
              {LOYALTY_PROGRAM_NAME} puan kullan ({loyaltyPoints} Puan)
            </span>
          </div>
          <input
            type="checkbox"
            className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            checked={useLoyalty}
            onChange={(event) => onUseLoyalty(event.target.checked)}
            data-ff-loyalty
          />
        </label>
      ) : null}

      <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex flex-col gap-2 font-sans text-xs sm:text-sm text-neutral-300">
        <div className="flex justify-between items-center">
          <span className="text-neutral-400">Ara Toplam</span>
          <span className="text-white font-medium">
            {formatTryMinor(quote?.merchandiseGrossSubtotalMinor ?? '0', currency)}
          </span>
        </div>

        {quote && BigInt(quote.cartDiscountTotalMinor) > 0n ? (
          <div className="flex justify-between items-center text-amber-400">
            <span>İndirim</span>
            <span className="font-semibold">
              -{formatTryMinor(quote.cartDiscountTotalMinor, currency)}
            </span>
          </div>
        ) : null}

        {quote && BigInt(quote.pickupDiscountMinor ?? '0') > 0n ? (
          <div className="flex justify-between items-center text-amber-400">
            <span>Gel-al indirimi (%10)</span>
            <span className="font-semibold">
              -{formatTryMinor(quote.pickupDiscountMinor ?? '0', currency)}
            </span>
          </div>
        ) : null}

        <div className="flex justify-between items-center">
          <span className="text-neutral-400">Teslimat Ücreti</span>
          <span
            className={
              BigInt(quote?.deliveryFeeMinor ?? '0') === 0n
                ? 'text-emerald-400 font-bold uppercase tracking-wider text-xs'
                : 'text-white font-medium'
            }
          >
            {BigInt(quote?.deliveryFeeMinor ?? '0') === 0n
              ? 'ÜCRETSİZ'
              : formatTryMinor(quote?.deliveryFeeMinor ?? '0', currency)}
          </span>
        </div>

        {quote && BigInt(quote.tipMinor ?? '0') > 0n ? (
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Kurye Bahşişi</span>
            <span className="text-amber-400 font-medium">
              +{formatTryMinor(quote.tipMinor ?? '0', currency)}
            </span>
          </div>
        ) : null}

        {quote && BigInt(quote.loyaltyRedeemedMinor) > 0n ? (
          <div className="flex justify-between items-center text-amber-400">
            <span>{LOYALTY_PROGRAM_NAME}</span>
            <span className="font-semibold">
              -{formatTryMinor(quote.loyaltyRedeemedMinor, currency)}
            </span>
          </div>
        ) : null}

        <div className="pt-3.5 mt-2 border-t border-white/[0.08] flex justify-between items-baseline">
          <span className="font-anton text-base uppercase text-white tracking-wide">
            Toplam Tutar
          </span>
          <div className="text-right">
            <span className="font-anton text-2xl sm:text-3xl text-amber-400 font-bold leading-none drop-shadow-[0_2px_12px_rgba(254,179,0,0.25)]">
              {quoteLoading ? '…' : formatTryMinor(total, currency)}
            </span>
            <span className="block font-sans text-[10px] text-neutral-400 mt-1 uppercase tracking-wider">
              KDV Dahildir
            </span>
          </div>
        </div>
      </div>

      {quote && !quote.minimumOrderEligible ? (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans">
          Minimum sipariş tutarı karşılanmadı.
        </div>
      ) : null}

      <p className="mt-3.5 font-sans text-[11px] text-neutral-400/90 text-center leading-normal">
        Siparişi onaylayarak{' '}
        <Link
          href="/on-bilgilendirme-formu"
          target="_blank"
          className="underline text-amber-400 hover:text-white transition-colors"
        >
          Ön Bilgilendirme Koşulları
        </Link>
        &apos;nı ve{' '}
        <Link
          href="/mesafeli-satis-sozlesmesi"
          target="_blank"
          className="underline text-amber-400 hover:text-white transition-colors"
        >
          Mesafeli Satış Sözleşmesi
        </Link>
        &apos;ni okuduğunuzu ve kabul ettiğinizi teyit edersiniz.
      </p>

      <button
        className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 active:scale-[0.99] text-neutral-950 font-anton text-base sm:text-lg uppercase tracking-wider shadow-[0_6px_25px_rgba(254,179,0,0.35)] flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        type="button"
        onClick={onPay}
        disabled={payDisabled || paying}
        data-ff-pay
      >
        <MaterialIcon name="shopping_cart_checkout" className="text-xl" />
        <span>
          {paying ? 'Ödeme başlatılıyor...' : `Siparişi Onayla • ${formatTryMinor(total, currency)}`}
        </span>
      </button>

      <a
        href="/account/support"
        className="mt-3 flex items-center justify-between p-3 rounded-xl bg-[#0e111a]/80 border border-white/[0.06] text-neutral-300 hover:border-amber-400/40 transition-all group"
        data-ff-support-entry="checkout"
      >
        <span className="font-sans text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
          Kadıköy mutfak şefi canlı hatta
        </span>
        <span className="font-anton text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1">
          Canlı Destek
          <MaterialIcon name="arrow_forward" className="text-xs" />
        </span>
      </a>
    </div>
  );
}
