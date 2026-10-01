'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import { fetchCart } from '../../lib/storefront/cart';
import { fetchPaymentStatus } from '../../lib/storefront/checkout';
import { isPaymentTerminalStatus } from '../../lib/storefront/payment-status';
import {
  readPaymentSummary,
  type PaymentSummarySnapshot,
} from '../../lib/storefront/payment-summary';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { IyzicoHostedPanel } from './iyzico-hosted-panel';
import { MaterialIcon } from './material-icon';
import { PaymentOrderSummary } from './payment-order-summary';
import { ShopError, ShopSkeleton } from './shop-states';

const STEPS = [
  { n: 1, label: 'Sepet', href: '/cart', active: false },
  { n: 2, label: 'Teslimat & Adres', href: '/checkout', active: false },
  { n: 3, label: 'Ödeme', href: null, active: true },
  { n: 4, label: 'Onay', href: null, active: false },
] as const;

export function PaymentStatusPage() {
  const params = useParams<{ checkoutId: string }>();
  const router = useRouter();
  const checkoutId = params.checkoutId;
  const [status, setStatus] = useState<string>('PENDING');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState('0');
  const [currency, setCurrency] = useState('TRY');
  const [error, setError] = useState<string | null>(null);
  const [providerPaymentId, setProviderPaymentId] = useState<string | null>(null);
  const [summary, setSummary] = useState<PaymentSummarySnapshot | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pollKey, setPollKey] = useState(0);

  useDeferredLoad(() => {
    setSummary(readPaymentSummary());
    if (typeof window !== 'undefined') {
      setProviderPaymentId(window.sessionStorage.getItem('ff_provider_payment_id'));
    }
    void fetchCart()
      .then((cart) => {
        setSummary((prev) => {
          if (cart.lineItems.length === 0) return prev;
          if (prev) return { ...prev, lines: cart.lineItems };
          return {
            lines: cart.lineItems,
            currency: cart.lineItems[0]?.currencySnapshot ?? 'TRY',
            merchandiseGrossSubtotalMinor: '0',
            finalPayableMinor: '0',
          };
        });
      })
      .catch(() => undefined);
  }, [checkoutId]);

  useEffect(() => {
    if (!checkoutId) return;
    let cancelled = false;
    let terminal = false;
    async function tick() {
      if (terminal) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const data = await fetchPaymentStatus(checkoutId);
        if (cancelled) return;
        setStatus(data.status);
        setAmountMinor(data.amountMinor);
        setCurrency(data.currency);
        setOrderId(data.orderId ?? null);
        if (data.providerPaymentId) setProviderPaymentId(data.providerPaymentId);
        setLoad('ready');
        setError(null);
        if (isPaymentTerminalStatus(data.status)) terminal = true;
        if (data.status === 'PAID' && data.orderId) {
          router.replace(`/orders/${data.orderId}/confirmation`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err));
          setLoad((prev) => (prev === 'ready' ? 'ready' : 'error'));
        }
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [checkoutId, router, pollKey]);

  if (load === 'loading') return <ShopSkeleton />;
  if (load === 'error') {
    return (
      <ShopError
        title="Ödeme durumu alınamadı"
        message={error ?? ''}
        surface="payment-status"
        onRetry={() => {
          setLoad('loading');
          setPollKey((n) => n + 1);
        }}
      />
    );
  }

  const failed = status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED';
  const payable = summary?.finalPayableMinor ?? amountMinor;

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="payment-status">
      <div className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg lg:py-space-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-md">
          <h1 className="font-headline-lg text-headline-lg uppercase tracking-wider">
            Güvenli Ödeme
          </h1>
          <nav
            className="flex items-center gap-2 sm:gap-4 font-label-md text-label-md uppercase overflow-x-auto"
            aria-label="Sipariş adımları"
          >
            {STEPS.map((step, index) => (
              <span key={step.n} className="contents">
                {index > 0 ? (
                  <span className="text-surface-container-highest shrink-0">/</span>
                ) : null}
                {step.href && !step.active ? (
                  <Link
                    href={step.href}
                    className="flex items-center gap-2 text-on-surface-variant/50 shrink-0"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm">
                      {step.n}
                    </span>
                    <span>{step.label}</span>
                  </Link>
                ) : (
                  <div
                    className={
                      step.active
                        ? 'flex items-center gap-2 text-primary-container font-bold shrink-0'
                        : 'flex items-center gap-2 text-on-surface-variant/50 shrink-0'
                    }
                  >
                    <span
                      className={
                        step.active
                          ? 'flex items-center justify-center w-6 h-6 rounded-full bg-primary-container text-surface-container-lowest font-label-sm font-black'
                          : 'flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm'
                      }
                    >
                      {step.n}
                    </span>
                    <span>{step.label}</span>
                  </div>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg lg:gap-space-xl items-start">
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            {failed ? (
              <div className="rounded-xl bg-surface-container-low p-space-lg flex flex-col gap-space-md">
                <div className="flex items-center gap-2 text-error">
                  <MaterialIcon name="error" />
                  <h2 className="font-headline-md uppercase">
                    {status === 'EXPIRED' ? 'Oturum doldu' : 'Ödeme tamamlanamadı'}
                  </h2>
                </div>
                <p className="font-body-md text-on-surface-variant">
                  {status === 'EXPIRED'
                    ? 'Ödeme süresi doldu. Checkout’tan yeniden başla.'
                    : 'Kart reddedildi veya işlem iptal edildi.'}
                </p>
                <Link
                  href="/checkout"
                  className="inline-flex items-center justify-center py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
                >
                  Checkout’a dön
                </Link>
              </div>
            ) : (
              <IyzicoHostedPanel
                amountMinor={payable}
                currency={summary?.currency ?? currency}
                providerPaymentId={providerPaymentId}
                onPaid={() => setPollKey((n) => n + 1)}
              />
            )}
            {orderId ? (
              <Link
                href={`/orders/${orderId}/confirmation`}
                className="font-label-sm uppercase text-secondary-container"
              >
                Sipariş onayına geç
              </Link>
            ) : null}
          </div>
          <div className="lg:col-span-5">
            <PaymentOrderSummary snapshot={summary} amountMinor={amountMinor} currency={currency} />
          </div>
        </div>
      </div>
    </main>
  );
}
