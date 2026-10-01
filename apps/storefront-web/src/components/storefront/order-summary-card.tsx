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
    <div className="w-full rounded-2xl bg-surface-container p-space-md lg:p-space-lg shadow-2xl backdrop-blur-xl flex flex-col gap-space-md">
      <div className="flex items-center justify-between pb-space-xs border-b border-surface-bright/30">
        <div className="flex items-center gap-space-xs">
          <MaterialIcon name="shopping_bag" className="text-primary" />
          <span className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
            Sipariş Özeti
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-sm text-label-sm text-primary">
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
      <div className="flex flex-col gap-2 pt-space-xs border-t border-surface-bright/20 font-body-sm text-body-sm">
        <div className="flex justify-between text-on-surface-variant">
          <span>Ara Toplam</span>
          <span className="text-on-surface font-label-md">{formatTryMinor(merchandiseMinor, currency)}</span>
        </div>
        <div className="flex justify-between text-on-surface-variant gap-2">
          <span>
            Teslimat ücreti
            {deliveryWaived ? (
              <span className="ml-1 text-[10px] bg-secondary-container/20 text-secondary-container px-1 rounded">
                Kupon
              </span>
            ) : null}
          </span>
          <span className="text-secondary font-label-md shrink-0">
            {deliveryWaived ? 'ÜCRETSİZ' : 'Ödemede'}
          </span>
        </div>
        {hasDiscount ? (
          <div className="flex justify-between text-secondary-container">
            <span>Kupon İndirimi</span>
            <span className="font-label-md">-{formatTryMinor(discountMinor, currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between items-baseline gap-2 pt-space-xs border-t border-surface-bright/40">
          <span className="font-headline-sm text-headline-sm text-on-surface uppercase">Genel Toplam</span>
          <span className="font-headline-md text-headline-md text-primary font-bold shrink-0">
            {formatTryMinor(payable, currency)}
          </span>
        </div>
      </div>
      <Link
        href={ctaHref}
        className="group w-full relative flex items-center justify-between px-space-md py-3.5 rounded-xl bg-gradient-to-r from-primary-container to-tertiary-container hover:brightness-110 text-on-primary-container font-label-lg text-label-lg uppercase tracking-wider shadow-[0_4px_24px_rgba(255,87,34,0.4)] active:scale-[0.98] transition-all overflow-hidden"
        data-ff-checkout-cta
      >
        <div className="flex items-center gap-2">
          <MaterialIcon name="shopping_cart_checkout" className="text-xl" />
          <span>{ctaLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-headline-sm text-headline-sm font-bold">
            {formatTryMinor(payable, currency)}
          </span>
          <MaterialIcon name="arrow_forward" className="text-xl transition-transform group-hover:translate-x-1.5" />
        </div>
      </Link>
      <div className="flex items-center justify-center gap-space-xs text-[11px] text-on-surface-variant/80">
        <MaterialIcon name="verified_user" className="text-xs text-primary" />
        <span>Güvenli 3D Ödeme • Hijyenik Mühürlü Teslimat</span>
      </div>
      {upsell && upsell.length > 0 ? (
        <UpsellSection items={upsell} onAdd={onAddUpsell} busyId={busyId} />
      ) : null}
    </div>
  );
}
