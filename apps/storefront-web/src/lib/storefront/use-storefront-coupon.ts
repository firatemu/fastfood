'use client';

import { useCallback, useState } from 'react';

import { formatTryMinor } from '../money';
import { previewCouponDiscount } from '../pricing-preview';
import { useDeferredLoad } from '../use-deferred-load';

import {
  clearStoredCouponCode,
  getStoredCouponCode,
  validateCoupon,
  type CouponStatus,
} from './promotions';

export function useStorefrontCoupon(merchandiseMinor: string, currency = 'TRY') {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<CouponStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [promo, setPromo] = useState<Awaited<ReturnType<typeof validateCoupon>> | null>(null);

  const preview = promo
    ? previewCouponDiscount({
        merchandiseMinor,
        kind: promo.kind,
        discountMinor: promo.discountMinor,
        discountPercentBps: promo.discountPercentBps,
        minMerchandiseMinor: promo.minMerchandiseMinor,
      })
    : { discountMinor: '0', minMet: true, deliveryWaived: false };

  const applyCode = useCallback(
    async (raw: string) => {
      const nextCode = raw.trim();
      if (!nextCode) return;
      setStatus('validating');
      try {
        const data = await validateCoupon(nextCode);
        const next = previewCouponDiscount({
          merchandiseMinor,
          kind: data.kind,
          discountMinor: data.discountMinor,
          discountPercentBps: data.discountPercentBps,
          minMerchandiseMinor: data.minMerchandiseMinor,
        });
        setPromo(data);
        setCode(data.code);
        setStatus('valid');
        if (!next.minMet) {
          setMessage(`Minimum sipariş: ${formatTryMinor(data.minMerchandiseMinor, currency)}`);
          return;
        }
        if (next.deliveryWaived) {
          setMessage(`${data.code} teslimat ücretini ödeme adımında düşürür.`);
        } else if (BigInt(next.discountMinor) > 0n) {
          setMessage(
            `${data.code} koduyla ${formatTryMinor(next.discountMinor, currency)} indirim aktif.`,
          );
        } else {
          setMessage(`${data.code} uygulandı.`);
        }
      } catch {
        setPromo(null);
        setStatus('invalid');
        setMessage('Kupon geçersiz, süresi dolmuş veya bulunamadı.');
      }
    },
    [merchandiseMinor, currency],
  );

  useDeferredLoad(() => {
    const stored = getStoredCouponCode();
    if (stored) {
      setCode(stored);
      void applyCode(stored);
    }
  }, [applyCode]);

  const uiStatus: CouponStatus =
    status === 'validating' || status === 'invalid' || status === 'idle' || !promo
      ? status
      : preview.minMet
        ? 'valid'
        : 'rejected';
  const uiMessage =
    promo && !preview.minMet
      ? `Minimum sipariş: ${formatTryMinor(promo.minMerchandiseMinor, currency)}`
      : message;

  return {
    code,
    setCode,
    status: uiStatus,
    message: uiMessage,
    apply: () => void applyCode(code),
    clear: () => {
      setPromo(null);
      setStatus('idle');
      setMessage(null);
      setCode('');
      clearStoredCouponCode();
    },
    discountMinor: preview.minMet ? preview.discountMinor : '0',
    deliveryWaived: preview.minMet && preview.deliveryWaived,
  };
}
