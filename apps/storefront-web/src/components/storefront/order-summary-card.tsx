'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { formatTryMinor } from '../../lib/money';
import { payableMinor } from '../../lib/pricing-preview';
import type { Cart } from '../../lib/storefront/cart';

import { CartLineCard } from './cart-line-card';
import { CouponForm, type CouponStatus } from './coupon-form';
import { MaterialIcon } from './material-icon';
import { UpsellSection } from './upsell-section';

type Line = Cart['lineItems'][number];

export function OrderSummaryCard({
  lines,
  currency,
  merchandiseMinor,
  discountMinor,
  deliveryWaived,
  couponCode,
  onCouponCode,
  couponStatus,
  couponMessage,
  onApplyCoupon,
  ctaHref,
  ctaLabel,
  lineCountLabel,
  draft,
  upsell,
  onAddUpsell,
  busyId,
  children,
}: {
  lines: Line[];
  currency: string;
  merchandiseMinor: string;
  discountMinor: string;
  deliveryWaived: boolean;
  couponCode: string;
  onCouponCode: (value: string) => void;
  couponStatus: CouponStatus;
  couponMessage: string | null;
  onApplyCoupon: () => void;
  ctaHref: string;
  ctaLabel: string;
  lineCountLabel: string;
  draft?: ReactNode;
  upsell?: Parameters<typeof UpsellSection>[0]['items'];
  onAddUpsell?: (productId: string) => void;
  busyId?: string | null;
  children?: ReactNode;
}) {
  const payable = payableMinor(merchandiseMinor, discountMinor);
  const hasDiscount = BigInt(discountMinor) > 0n;

  return (
    <div className="w-full rounded-3xl bg-[#12151f]/90 backdrop-blur-xl border border-white/[0.08] p-5 md:p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <MaterialIcon name="shopping_bag" className="text-amber-400 text-xl" />
          <span className="font-anton text-xl text-white uppercase tracking-wide">
            Sipariş Özeti
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 font-anton text-xs text-amber-400">
          {lineCountLabel}
        </span>
      </div>
      <div className="flex flex-col gap-space-sm max-h-[360px] overflow-y-auto pr-1">
        {draft}
        {lines.map((line) => (
          <CartLineCard key={line.id} line={line} compact />
        ))}
        {children}
      </div>
      <CouponForm
        code={couponCode}
        onCodeChange={onCouponCode}
        status={couponStatus}
        message={couponMessage}
        onApply={onApplyCoupon}
      />
      <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.08] font-body-sm text-body-sm">
        <div className="flex justify-between text-neutral-400">
          <span>Ara Toplam</span>
          <span className="text-white font-medium">
            {formatTryMinor(merchandiseMinor, currency)}
          </span>
        </div>
        <div className="flex justify-between text-neutral-400 gap-2">
          <span>
            Teslimat ücreti
            {deliveryWaived ? (
              <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-400 px-1 rounded font-bold">
                Kupon
              </span>
            ) : null}
          </span>
          <span className="text-amber-400 font-bold shrink-0">
            {deliveryWaived ? 'ÜCRETSİZ' : 'Ödemede'}
          </span>
        </div>
        {hasDiscount ? (
          <div className="flex justify-between text-amber-400 font-bold">
            <span>Kupon İndirimi</span>
            <span>-{formatTryMinor(discountMinor, currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between items-baseline gap-2 pt-2 border-t border-white/[0.08]">
          <span className="font-anton text-xl text-white uppercase tracking-wide">
            Genel Toplam
          </span>
          <span className="font-anton text-3xl text-amber-400 drop-shadow-sm shrink-0">
            {formatTryMinor(payable, currency)}
          </span>
        </div>
      </div>
      <Link
        href={ctaHref}
        className="group w-full relative flex items-center justify-between px-5 py-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 text-neutral-950 font-anton text-lg uppercase tracking-wider shadow-[0_6px_25px_rgba(254,179,0,0.35)] active:scale-[0.98] transition-all overflow-hidden"
        data-ff-checkout-cta
      >
        <div className="flex items-center gap-2">
          <MaterialIcon name="shopping_cart_checkout" className="text-xl" />
          <span>{ctaLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-anton text-xl font-bold">
            {formatTryMinor(payable, currency)}
          </span>
          <MaterialIcon
            name="arrow_forward"
            className="text-xl transition-transform group-hover:translate-x-1.5"
          />
        </div>
      </Link>
      <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 font-medium pt-1">
        <MaterialIcon name="verified_user" className="text-sm text-amber-400" />
        <span>Güvenli 3D Ödeme • Hijyenik Mühürlü Teslimat</span>
      </div>
      {upsell && upsell.length > 0 ? (
        <UpsellSection items={upsell} onAdd={onAddUpsell} busyId={busyId} />
      ) : null}
    </div>
  );
}
