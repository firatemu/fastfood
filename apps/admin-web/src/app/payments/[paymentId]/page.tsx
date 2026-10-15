'use client';

import { formatTryMinor } from '@fastfood/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { ConfirmDialog } from '../../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { OpsPageHeader } from '../../../components/ops/ops-page-header';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { OperationalTable } from '../../../components/ops/ops-table';
import { useOpsToast } from '../../../components/ops/ops-toast';
import { ActionButton, KeylineCard, StatusBadge } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import {
  canSubmitRefund,
  isPaymentPaid,
  paymentStatusLabel,
  paymentStatusTone,
  refundStatusLabel,
  refundStatusTone,
  remainingRefundableMinor,
} from '../../../lib/finance-ops';
import { adminPaymentSchema, adminRefundsSchema, refundSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

type Payment = z.infer<typeof adminPaymentSchema>['data'];
type Refund = z.infer<typeof adminRefundsSchema>['data'][number];

export default function PaymentDetailPage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();
  const [state, setState] = useState<LoadState<Payment>>({ status: 'loading' });
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('customer_request');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const [payment, refundRes] = await Promise.all([
        client.request({ path: `admin/payments/${paymentId}`, schema: adminPaymentSchema }),
        client.request({
          path: `admin/payments/${paymentId}/refunds`,
          schema: adminRefundsSchema,
        }),
      ]);
      setRefunds(refundRes.data);
      setState({ status: 'ready', data: payment.data });
      const remaining = remainingRefundableMinor(payment.data.amountMinor, refundRes.data);
      setAmount((prev) => prev || remaining.toString());
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced, paymentId]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const remaining =
    state.status === 'ready' ? remainingRefundableMinor(state.data.amountMinor, refunds) : 0n;

  async function createRefund() {
    if (state.status !== 'ready') return;
    if (
      !canSubmitRefund({
        paymentId,
        amountMinor: amount,
        paymentStatus: state.data.status,
        remainingMinor: remaining,
      })
    ) {
      toast.error('İade tutarı kalan bakiyeyi aşamaz ve ödeme PAID olmalı.');
      setConfirm(false);
      return;
    }
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/payments/${paymentId}/refunds`,
        body: { amountMinor: amount.trim(), reason: reason.trim() || undefined },
        schema: refundSchema,
      });
      toast.success('İade kaydı oluşturuldu. Kalan bakiye yeniden yüklendi.');
      setConfirm(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-page">
      <OpsBoundary state={state} onRetry={() => void load()}>
        {(p) => (
          <>
            <OpsPageHeader
              title={p.checkoutSessionId ?? p.id}
              scope={p.providerPaymentId ?? undefined}
              lede="Ödemenin durumunu, tutarını ve bu ödemeye bağlı iadeleri tek ekranda izleyin. Kart bilgisi saklanmaz; iade uygunluğu ve kalan bakiye backend tarafından belirlenir."
            />
            <div className="ops-split">
              <KeylineCard title="Ödeme">
                <dl className="ops-form">
                  <div>
                    <dt>ID</dt>
                    <dd className="mono">{p.id}</dd>
                  </div>
                  <div>
                    <dt>Checkout</dt>
                    <dd className="mono">{p.checkoutSessionId ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Tutar</dt>
                    <dd>
                      {p.amountMinor ? formatTryMinor(p.amountMinor, p.currency ?? 'TRY') : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Durum</dt>
                    <dd>
                      <StatusBadge tone={paymentStatusTone(p.status)}>
                        {paymentStatusLabel(p.status)}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div>
                    <dt>Sağlayıcı ref</dt>
                    <dd className="mono">{p.providerPaymentId ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Kalan iade (gösterim)</dt>
                    <dd className="mono">
                      {formatTryMinor(remaining.toString(), p.currency ?? 'TRY')}
                    </dd>
                  </div>
                </dl>
                {isPaymentPaid(p.status) ? (
                  <div className="ops-form">
                    <label className="ops-field">
                      İade tutarı (kuruş)
                      <input
                        className="ops-input"
                        value={amount}
                        inputMode="numeric"
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </label>
                    <label className="ops-field">
                      Gerekçe
                      <input
                        className="ops-input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                    <ActionButton
                      variant="danger"
                      disabled={
                        busy ||
                        !canSubmitRefund({
                          paymentId,
                          amountMinor: amount,
                          paymentStatus: p.status,
                          remainingMinor: remaining,
                        })
                      }
                      onClick={() => setConfirm(true)}
                    >
                      İade başlat
                    </ActionButton>
                  </div>
                ) : (
                  <p className="ops-page__lede">Yalnızca PAID ödemeler iade edilir.</p>
                )}
                <p>
                  <Link href={`/refunds?paymentId=${p.id}`}>İade formu</Link>
                </p>
              </KeylineCard>
              <KeylineCard title="İade geçmişi">
                {refunds.length === 0 ? (
                  <p className="ops-page__lede">Bu ödemede iade yok.</p>
                ) : (
                  <OperationalTable<Refund>
                    ariaLabel="İadeler"
                    rowKey={(r) => r.id}
                    columns={[
                      { key: 'id', header: 'ID', mono: true, render: (r) => r.id.slice(0, 8) },
                      {
                        key: 'amount',
                        header: 'Tutar',
                        numeric: true,
                        render: (r) =>
                          formatTryMinor(r.amountMinor, r.currency ?? p.currency ?? 'TRY'),
                      },
                      {
                        key: 'status',
                        header: 'Durum',
                        render: (r) => (
                          <StatusBadge tone={refundStatusTone(r.status)}>
                            {refundStatusLabel(r.status)}
                          </StatusBadge>
                        ),
                      },
                      { key: 'reason', header: 'Gerekçe', render: (r) => r.reason ?? '—' },
                    ]}
                    rows={refunds}
                  />
                )}
              </KeylineCard>
            </div>
          </>
        )}
      </OpsBoundary>
      <ConfirmDialog
        open={confirm}
        title="İade oluştur"
        body={`${formatTryMinor(amount)} iade edilecek. Gateway limiti backend’de doğrulanır.`}
        confirmLabel="İade et"
        danger
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void createRefund()}
      />
    </div>
  );
}
