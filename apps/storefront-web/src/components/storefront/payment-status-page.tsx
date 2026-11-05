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
  const [providerPaymentId, setProviderPaymentId] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState('0');
  const [currency, setCurrency] = useState('TRY');
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<PaymentSummarySnapshot | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pollKey, setPollKey] = useState(0);

  useDeferredLoad(() => {
    setSummary(readPaymentSummary());
    if (typeof window !== 'undefined') {
      setRedirectUrl(window.sessionStorage.getItem('ff_iyzico_redirect'));
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
        if (data.providerPaymentId) {
          setProviderPaymentId(data.providerPaymentId);
        }
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
    <main className="w-full pt-24 pb-20 bg-[#0a0c14] min-h-screen text-neutral-100 relative" data-ff-surface="payment-status">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(254,179,0,0.12),rgba(255,255,255,0))] pointer-events-none" />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-neutral-400 font-anton text-xs uppercase tracking-widest mb-2">
              <span className="text-amber-400">Sepet</span>
              <MaterialIcon name="chevron_right" className="text-xs text-neutral-600" />
              <span className="text-amber-400">Teslimat & Adres</span>
              <MaterialIcon name="chevron_right" className="text-xs text-neutral-600" />
              <span className="text-white">Güvenli Ödeme</span>
              <MaterialIcon name="chevron_right" className="text-xs text-neutral-600" />
              <span className="text-neutral-500">Onay</span>
            </div>
            <h1 className="font-anton text-3xl sm:text-4xl uppercase text-white tracking-wide drop-shadow-sm">
              Güvenli Ödeme & 3-D Secure
            </h1>
          </div>

          <nav
            className="flex items-center gap-2 sm:gap-3 font-anton text-xs uppercase tracking-wider overflow-x-auto"
            aria-label="Sipariş adımları"
          >
            {STEPS.map((step, index) => (
              <span key={step.n} className="contents">
                {index > 0 ? (
                  <span className="text-neutral-600 shrink-0">/</span>
                ) : null}
                {step.href && !step.active ? (
                  <Link
                    href={step.href}
                    className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors shrink-0"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-[#141824] text-neutral-400 text-[10px]">
                      {step.n}
                    </span>
                    <span>{step.label}</span>
                  </Link>
                ) : (
                  <div
                    className={
                      step.active
                        ? 'flex items-center gap-1.5 text-amber-400 shrink-0'
                        : 'flex items-center gap-1.5 text-neutral-500 shrink-0'
                    }
                  >
                    <span
                      className={
                        step.active
                          ? 'flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-neutral-950 font-bold text-[10px] shadow-[0_2px_8px_rgba(254,179,0,0.3)]'
                          : 'flex items-center justify-center w-5 h-5 rounded-lg bg-[#141824] text-neutral-400 text-[10px]'
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            {failed ? (
              <div className="rounded-2xl bg-[#12151f]/90 border border-rose-500/30 p-6 sm:p-8 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xl">
                    <MaterialIcon name="error" filled />
                  </div>
                  <div>
                    <h2 className="font-anton text-xl uppercase tracking-wide text-white">
                      {status === 'EXPIRED' ? 'Oturum Süresi Doldu' : 'Ödeme Tamamlanamadı'}
                    </h2>
                    <p className="font-sans text-xs text-neutral-400 mt-0.5">
                      {status === 'EXPIRED'
                        ? 'Ödeme oturum süresi doldu. Lütfen sepetten yeniden başlatın.'
                        : 'Kartınız banka tarafından reddedildi veya işlem iptal edildi.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/checkout"
                    className="inline-flex items-center justify-center py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 font-anton text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(254,179,0,0.3)] hover:scale-[1.01] transition-all"
                  >
                    Siparişi Tekrar Dene
                  </Link>
                </div>
              </div>
            ) : (
              <IyzicoHostedPanel
                amountMinor={payable}
                currency={summary?.currency ?? currency}
                redirectUrl={redirectUrl}
                providerPaymentId={providerPaymentId}
                checkoutId={checkoutId}
                onRefresh={() => setPollKey((n) => n + 1)}
              />
            )}

            {orderId ? (
              <Link
                href={`/orders/${orderId}/confirmation`}
                className="font-anton text-xs uppercase tracking-wider text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
              >
                <span>Sipariş Onayına Geç</span>
                <MaterialIcon name="arrow_forward" className="text-sm" />
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
