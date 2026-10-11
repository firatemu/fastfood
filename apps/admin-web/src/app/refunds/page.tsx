'use client';

import { formatTryMinor } from '@fastfood/contracts';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { errorMessage } from '../../components/async-boundary';
import { ConfirmDialog } from '../../components/ops/confirm-dialog';
import { OpsPageHeader } from '../../components/ops/ops-page-header';
import { useOpsSync } from '../../components/ops/ops-sync';
import { ActionButton, KeylineCard, StatusBadge } from '../../components/ops/ops-ui';
import { createAdminClient } from '../../lib/api';
import {
  canSubmitRefund,
  isFinanceUuid,
  isPaymentPaid,
  paymentStatusLabel,
  paymentStatusTone,
  refundStatusLabel,
  remainingRefundableMinor,
} from '../../lib/finance-ops';
import { adminPaymentSchema, adminRefundsSchema, refundSchema } from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

type Payment = z.infer<typeof adminPaymentSchema>['data'];

function RefundsInner() {
  const search = useSearchParams();
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [paymentId, setPaymentId] = useState(search.get('paymentId') ?? '');
  const [refundId, setRefundId] = useState('');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [refunds, setRefunds] = useState<z.infer<typeof adminRefundsSchema>['data']>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('customer_request');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [lookup, setLookup] = useState<{ id: string; amountMinor: string; status?: string } | null>(
    null,
  );

  const remaining = remainingRefundableMinor(payment?.amountMinor, refunds);

  const loadPayment = useCallback(async () => {
    if (!isFinanceUuid(paymentId)) return;
    setError(null);
    try {
      const client = createAdminClient();
      const [pay, list] = await Promise.all([
        client.request({ path: `admin/payments/${paymentId.trim()}`, schema: adminPaymentSchema }),
        client.request({
          path: `admin/payments/${paymentId.trim()}/refunds`,
          schema: adminRefundsSchema,
        }),
      ]);
      setPayment(pay.data);
      setRefunds(list.data);
      const left = remainingRefundableMinor(pay.data.amountMinor, list.data);
      setAmount((prev) => prev || left.toString());
      markSynced();
    } catch (err) {
      setPayment(null);
      setRefunds([]);
      setError(errorMessage(err));
      markStale();
    }
  }, [markStale, markSynced, paymentId]);

  useEffect(() => {
    registerRefresh(() => {
      if (isFinanceUuid(paymentId)) void loadPayment();
    });
    return () => registerRefresh(null);
  }, [loadPayment, paymentId, registerRefresh]);

  useDeferredLoad(() => {
    if (isFinanceUuid(paymentId)) void loadPayment();
  }, [paymentId]);

  async function createRefund() {
    if (
      !payment ||
      !canSubmitRefund({
        paymentId,
        amountMinor: amount,
        paymentStatus: payment.status,
        remainingMinor: remaining,
      })
    ) {
      setError('İade gönderilemez: PAID ve kalan bakiyeyi aşmayan kuruş tutarı gerekli.');
      setConfirm(false);
      return;
    }
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await createAdminClient().request({
        method: 'POST',
        path: `admin/payments/${paymentId.trim()}/refunds`,
        body: { amountMinor: amount.trim(), reason: reason.trim() || undefined },
        schema: refundSchema,
      });
      setFlash(`İade ${res.data.id}`);
      setRefundId(res.data.id);
      setConfirm(false);
      await loadPayment();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadRefund() {
    if (!isFinanceUuid(refundId)) {
      setError('Geçerli iade UUID girin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createAdminClient().request({
        path: `admin/refunds/${refundId.trim()}`,
        schema: refundSchema,
      });
      setLookup({
        id: res.data.id,
        amountMinor: res.data.amountMinor,
        status: res.data.status,
      });
      markSynced();
    } catch (err) {
      setError(errorMessage(err));
      markStale();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-page">
      <OpsPageHeader
        title="İadeler"
        lede="Bir ödeme kaydını yükleyin; o ödemeye ait iadeleri görüntüleyin ve yeni iade başlatın. Kalan iade edilebilir tutar ile iade uygunluğu backend tarafından belirlenir."
      />
      <div className="ops-split">
        <KeylineCard title="Ödeme yükle / iade oluştur">
          <div className="ops-form">
            <label className="ops-field">
              Ödeme ID
              <input
                className="ops-input"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
              />
            </label>
            <ActionButton disabled={busy} onClick={() => void loadPayment()}>
              Ödemeyi getir
            </ActionButton>
            {payment ? (
              <>
                <p>
                  Durum{' '}
                  <StatusBadge tone={paymentStatusTone(payment.status)}>
                    {paymentStatusLabel(payment.status)}
                  </StatusBadge>{' '}
                  · tutar{' '}
                  {payment.amountMinor
                    ? formatTryMinor(payment.amountMinor, payment.currency ?? 'TRY')
                    : '—'}{' '}
                  · kalan (gösterim){' '}
                  {formatTryMinor(remaining.toString(), payment.currency ?? 'TRY')}
                </p>
                <p>
                  <Link href={`/payments/${payment.id}`}>Ödeme kaydı</Link>
                </p>
                {isPaymentPaid(payment.status) ? (
                  <>
                    <label className="ops-field">
                      Tutar (kuruş)
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
                          paymentStatus: payment.status,
                          remainingMinor: remaining,
                        })
                      }
                      onClick={() => setConfirm(true)}
                    >
                      İade başlat
                    </ActionButton>
                  </>
                ) : (
                  <p className="ops-page__lede">Ödeme PAID değil.</p>
                )}
              </>
            ) : null}
          </div>
        </KeylineCard>
        <KeylineCard title="İade sorgula">
          <div className="ops-form">
            <label className="ops-field">
              İade ID
              <input
                className="ops-input"
                value={refundId}
                onChange={(e) => setRefundId(e.target.value)}
              />
            </label>
            <ActionButton disabled={busy} onClick={() => void loadRefund()}>
              Getir
            </ActionButton>
            {lookup ? (
              <p>
                {lookup.id} · {formatTryMinor(lookup.amountMinor)} ·{' '}
                {refundStatusLabel(lookup.status)}
              </p>
            ) : null}
          </div>
        </KeylineCard>
      </div>
      {flash ? (
        <p className="ops-flash ops-flash--ok" role="status">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="ops-flash ops-flash--err" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirm}
        title="İade oluştur"
        body={`${formatTryMinor(amount)}. Fazla iade backend tarafından reddedilir.`}
        confirmLabel="İade et"
        danger
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void createRefund()}
      />
    </div>
  );
}

export default function RefundsPage() {
  return (
    <Suspense fallback={<p className="ops-page__lede">Yükleniyor…</p>}>
      <RefundsInner />
    </Suspense>
  );
}
