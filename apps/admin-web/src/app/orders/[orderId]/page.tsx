'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useBranchContext } from '../../../components/ops/branch-context';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import {
  ConfirmDialog,
  useConfirm,
} from '../../../components/ops/order-detail-v2/order-confirm-dialog';
import { OrderFlowRail } from '../../../components/ops/order-detail-v2/order-flow-rail';
import { OrderReceiptModal } from '../../../components/ops/order-detail-v2/order-receipt-modal';
import {
  BranchAssignmentsCard,
  CustomerCard,
  DeliveryAddressCard,
  OrderAuditTrail,
  OrderFinancialCard,
  OrderItemsGrid,
  OrderOperationsPanel,
  PaymentCard,
  RefundCalculator,
  sumSelectedItemsMinor,
} from '../../../components/ops/order-detail-v2/order-sidebars';
import { OrderSummaryHero } from '../../../components/ops/order-detail-v2/order-summary-hero';
import { createAdminClient } from '../../../lib/api';
import { shortId, formatOpsDateTime } from '../../../lib/ops-time';
import {
  allowedTransitions,
  canAssignCourier,
  canReassignBranch,
  orderStatusLabel,
  statusGroupOf,
} from '../../../lib/order-status';
import {
  adminCustomerSchema,
  adminPaymentsSchema,
  couriersResponseSchema,
  deliveriesCreateSchema,
  orderResponseSchema,
  pickupTokenResponseSchema,
  refundSchema,
  unknownDataSchema,
  type orderSchema,
} from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

type Order = z.infer<typeof orderSchema>;
type Customer = z.infer<typeof adminCustomerSchema>['data'] | null;
type Payment = z.infer<typeof adminPaymentsSchema>['data'][number] | null;

const ACTION_LABELS: Record<string, string> = {
  PREPARING: 'Hazırlığa al',
  READY_FOR_COURIER: 'Paketlendi olarak işaretle',
  COURIER_ASSIGNED: 'Kurye atandı',
  PICKED_UP: 'Kurye aldı',
  ON_THE_WAY: 'Yola çıktı',
  DELIVERED: 'Teslim edildi',
  REFUND_PENDING: 'İade sürecini başlat',
  PARTIALLY_REFUNDED: 'Kısmi iade işaretle',
  REFUNDED: 'İade tamamlandı',
  CANCELLED: 'İptal et',
  REJECTED: 'Reddet',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const { branches } = useBranchContext();
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const confirm = useConfirm();

  const [state, setState] = useState<LoadState<Order>>({ status: 'loading' });
  const [customer, setCustomer] = useState<Customer>(null);
  const [payment, setPayment] = useState<Payment>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [couriers, setCouriers] = useState<Array<{ id: string; displayName?: string }>>([]);
  const [transitionTarget, setTransitionTarget] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [reassignId, setReassignId] = useState('');
  const [courierId, setCourierId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptToken, setReceiptToken] = useState<{
    token: string;
    prefix: string;
    expiresAt: string;
  } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());

  /**
   * Selecting refund items re-fills the refund amount from that selection.
   *
   * This runs inside the selection handlers rather than in an effect. An effect
   * keyed on `state` also re-fired on every refresh, which silently discarded an
   * amount the operator had typed into the refund field by hand.
   */
  const applyRefundSelection = useCallback(
    (next: Set<string>) => {
      setSelectedItemIds(next);
      if (next.size === 0) return;
      if (state.status !== 'ready') return;
      setRefundAmount(sumSelectedItemsMinor(state.data, next).toString());
    },
    [state],
  );

  const toggleRefundItem = useCallback(
    (itemId: string, selected: boolean) => {
      const next = new Set(selectedItemIds);
      if (selected) next.add(itemId);
      else next.delete(itemId);
      applyRefundSelection(next);
    },
    [applyRefundSelection, selectedItemIds],
  );

  const setSelectedRefundItems = useCallback(
    (itemIds: string[]) => {
      applyRefundSelection(new Set(itemIds));
    },
    [applyRefundSelection],
  );

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const res = await client.request({
        path: `admin/orders/${orderId}`,
        schema: orderResponseSchema,
      });
      setState({ status: 'ready', data: res.data });
      setRefundAmount(res.data.finalPayableMinor ?? '');
      setSelectedItemIds(new Set());
      const next = allowedTransitions(res.data.status)[0] ?? '';
      setTransitionTarget(next);
      if (res.data.branchId) setReassignId((prev) => prev || res.data.branchId || '');

      const [paymentsRes, couriersRes] = await Promise.all([
        client.request({ path: 'admin/payments', schema: adminPaymentsSchema }).catch(() => null),
        client
          .request({ path: 'admin/couriers', schema: couriersResponseSchema })
          .catch(() => null),
      ]);

      const paymentMatch =
        paymentsRes?.data.find(
          (row) =>
            row.checkoutSessionId &&
            res.data.checkoutSessionId &&
            row.checkoutSessionId === res.data.checkoutSessionId,
        ) ?? null;
      setPayment(paymentMatch);
      setPaymentId(paymentMatch?.id ?? null);

      const list = (couriersRes?.data ?? []).map((c) => ({ id: c.id, displayName: c.displayName }));
      setCouriers(list);
      setCourierId((prev) => prev || list[0]?.id || '');

      if (res.data.userId) {
        const customerRes = await client
          .request({ path: `admin/customers/${res.data.userId}`, schema: adminCustomerSchema })
          .catch(() => null);
        setCustomer(customerRes?.data ?? null);
      } else {
        setCustomer(null);
      }
      markSynced();
    } catch (err) {
      setState({ status: 'error', error: err });
      markStale();
    }
  }, [orderId, markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const order = state.status === 'ready' ? state.data : null;
  const nextStatuses = useMemo(() => (order ? allowedTransitions(order.status) : []), [order]);

  const extraModifiersCount = useMemo(() => {
    if (!order) return 0;
    return (order.items ?? []).reduce(
      (sum, item) =>
        sum +
        (item.modifiers ?? []).filter((mod) => {
          if (!mod.priceDeltaMinorSnapshot) return false;
          return BigInt(mod.priceDeltaMinorSnapshot) > 0n;
        }).length,
      0,
    );
  }, [order]);

  const group = order ? statusGroupOf(order.status) : null;

  const openReceipt = useCallback(async () => {
    setReceiptOpen(true);
    setPrinting(true);
    try {
      const res = await createAdminClient().request({
        method: 'POST',
        path: `admin/orders/${orderId}/pickup-token`,
        schema: pickupTokenResponseSchema,
      });
      setReceiptToken({
        token: res.data.token,
        prefix: res.data.prefix,
        expiresAt: res.data.expiresAt,
      });
    } catch (err) {
      console.warn('pickup-token alınamadı', err);
      setReceiptToken(null);
    } finally {
      setPrinting(false);
    }
  }, [orderId]);

  const closeReceipt = useCallback(() => {
    setReceiptOpen(false);
    setReceiptToken(null);
  }, []);

  const printReceipt = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  async function runTransition(target: string, reason?: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await createAdminClient().request({
        method: 'POST',
        path: `admin/orders/${orderId}/transitions`,
        body: { toStatus: target, reason },
        schema: orderResponseSchema,
      });
      setState({ status: 'ready', data: res.data });
      setFlash(`Durum güncellendi: ${orderStatusLabel(res.data.status)}`);
      setTransitionReason('');
      confirm.close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function runReassign() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await createAdminClient().request({
        method: 'POST',
        path: `admin/orders/${orderId}/reassign-branch`,
        body: { branchId: reassignId, reason: transitionReason },
        schema: orderResponseSchema,
      });
      setState({ status: 'ready', data: res.data });
      setFlash('Şube yeniden atandı.');
      confirm.close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function runRefund() {
    if (!paymentId) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/payments/${paymentId}/refunds`,
        body: { amountMinor: refundAmount, reason: 'ops_order_detail' },
        schema: refundSchema,
      });
      setFlash('İade talebi gönderildi.');
      confirm.close();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function runCourier() {
    if (!order?.branchId) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const client = createAdminClient();
      const created = await client.request({
        method: 'POST',
        path: 'admin/deliveries',
        body: { orderId: order.id, branchId: order.branchId },
        schema: deliveriesCreateSchema,
      });
      await client.request({
        method: 'POST',
        path: `admin/deliveries/${created.data.id}/assign`,
        body: { courierId },
        schema: unknownDataSchema,
      });
      setFlash('Kurye ataması gönderildi.');
      confirm.close();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-page">
      {flash ? (
        <p className="ops-alert ops-alert--ok" role="status">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="ops-alert ops-alert--err" role="alert">
          {error}
        </p>
      ) : null}

      {order ? (
        <OrderReceiptModal
          order={order}
          receiptToken={receiptToken}
          printing={printing}
          open={receiptOpen}
          onClose={closeReceipt}
          onPrint={printReceipt}
        />
      ) : null}

      {order ? (
        <ConfirmDialog
          open={confirm.isOpen}
          title={(() => {
            switch (confirm.confirmKind) {
              case 'cancel':
                return 'Siparişi iptal et';
              case 'refund':
                return 'İade başlat';
              case 'reassign':
                return 'Şube değiştir';
              case 'courier':
                return 'Kurye ata';
              default:
                return '';
            }
          })()}
          body={(() => {
            switch (confirm.confirmKind) {
              case 'cancel':
                return 'Yüksek etkili FSM geçişi. Backend izin vermezse işlem reddedilir.';
              case 'refund':
                return paymentId
                  ? `Ödeme ${shortId(paymentId)} için ${formatTryMinor(refundAmount)} iade gönderilecek.`
                  : 'İade tutarını girip onaylayın.';
              case 'reassign':
                return 'Sipariş başka şubeye atanacak. Teslim alınmış siparişlerde backend reddeder.';
              case 'courier':
                return 'Teslimat kaydı oluşturulup seçilen kuryeye atanacak.';
              default:
                return '';
            }
          })()}
          confirmLabel={(() => {
            switch (confirm.confirmKind) {
              case 'cancel':
                return 'İptal et';
              case 'refund':
                return 'İadeyi gönder';
              case 'reassign':
                return 'Şubeyi değiştir';
              case 'courier':
                return 'Ata';
              default:
                return 'Onayla';
            }
          })()}
          danger={confirm.confirmKind === 'cancel' || confirm.confirmKind === 'refund'}
          busy={busy}
          onCancel={() => confirm.close()}
          onConfirm={() => {
            if (!confirm.confirmKind) return;
            const kind = confirm.confirmKind;
            if (kind === 'cancel') {
              void runTransition(transitionTarget, transitionReason);
            } else if (kind === 'refund') {
              void runRefund();
            } else if (kind === 'reassign') {
              void runReassign();
            } else if (kind === 'courier') {
              void runCourier();
            }
          }}
        />
      ) : null}

      <OpsBoundary state={state} onRetry={() => void load()}>
        {(current) => {
          const branchName = branches.find((b) => b.id === current.branchId)?.name ?? null;
          return (
            <div className="order-detail-v2">
              <button
                type="button"
                className="order-detail-v2__back"
                onClick={() => router.push('/orders')}
              >
                ← Siparişler listesi
              </button>

              <OrderSummaryHero
                order={current}
                branchName={branchName}
                onOpenReceipt={() => void openReceipt()}
                printing={printing}
              />

              <OrderFlowRail order={current} />

              <section className="order-detail-v2__panels">
                <div className="order-detail-v2__column order-detail-v2__column--side">
                  <CustomerCard customer={customer} userId={current.userId} />
                  <DeliveryAddressCard order={current} />
                  <BranchAssignmentsCard order={current} />
                  <PaymentCard payment={payment} />
                  <OrderFinancialCard order={current} extraModifiersCount={extraModifiersCount} />
                </div>
                <div className="order-detail-v2__column order-detail-v2__column--main">
                  <OrderOperationsPanel
                    order={current}
                    nextStatuses={nextStatuses}
                    transitionTarget={transitionTarget}
                    onTransitionChange={setTransitionTarget}
                    transitionReason={transitionReason}
                    onReasonChange={setTransitionReason}
                    canReassignBranch={canReassignBranch(current.status)}
                    branches={branches}
                    reassignId={reassignId}
                    onReassignChange={setReassignId}
                    paymentId={paymentId}
                    refundAmount={refundAmount}
                    onRefundAmountChange={setRefundAmount}
                    canAssignCourier={canAssignCourier(current.status)}
                    couriers={couriers}
                    courierId={courierId}
                    onCourierChange={setCourierId}
                    onApplyTransition={() => {
                      if (transitionTarget === 'CANCELLED' || transitionTarget === 'REJECTED') {
                        confirm.open('cancel');
                        return;
                      }
                      if (
                        transitionTarget === 'REFUND_PENDING' ||
                        transitionTarget === 'REFUNDED'
                      ) {
                        confirm.open('refund');
                        return;
                      }
                      void runTransition(transitionTarget, transitionReason);
                    }}
                    onApplyReassign={() => confirm.open('reassign')}
                    onApplyRefund={() => confirm.open('refund')}
                    onApplyCourier={() => confirm.open('courier')}
                    busy={busy}
                    actionLabels={ACTION_LABELS}
                  />

                  {paymentId ? (
                    <RefundCalculator
                      order={current}
                      selectedItemIds={selectedItemIds}
                      orderCurrency={current.currency ?? 'TRY'}
                      busy={busy}
                      onApply={(value) => {
                        setRefundAmount(value);
                        confirm.open('refund');
                      }}
                    />
                  ) : null}

                  <OrderItemsGrid
                    order={current}
                    currency={current.currency ?? 'TRY'}
                    selectedItemIds={selectedItemIds}
                    onToggleItem={toggleRefundItem}
                    onSetSelectedItems={setSelectedRefundItems}
                  />

                  <OrderAuditTrail order={current} />
                </div>
              </section>

              <div className="order-detail-v2__meta muted">
                {current.events?.length ?? 0} olay · {group ? `${group} grubu` : 'grupsuz'} ·
                Oluşturma {formatOpsDateTime(current.createdAt)}
              </div>
            </div>
          );
        }}
      </OpsBoundary>
    </div>
  );
}
