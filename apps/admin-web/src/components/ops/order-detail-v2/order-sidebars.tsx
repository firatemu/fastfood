'use client';

import { formatTryMinor } from '@fastfood/contracts';
import Link from 'next/link';
import { useMemo } from 'react';
import type { z } from 'zod';

import { shortId, formatOpsDateTime } from '../../../lib/ops-time';
import {
  orderStatusLabel,
  paymentLabel,
  paymentTone,
} from '../../../lib/order-status';
import type { orderSchema } from '../../../lib/schemas';
import { StatusBadge } from '../ops-ui';

type Order = z.infer<typeof orderSchema>;

export interface CustomerCardProps {
  customer:
    | {
        userId?: string | null;
        displayName?: string | null;
        phone?: string | null;
        email?: string | null;
        phoneVerified?: boolean;
        pointsBalance?: string | null;
      }
    | null;
  userId?: string | null;
}

export function CustomerCard({ customer, userId }: CustomerCardProps) {
  const isGuest = !userId;
  if (!customer && isGuest) {
    return (
      <section className="order-summary-card">
        <header>
          <h3>Müşteri</h3>
          <span className="muted">Misafir</span>
        </header>
        <p className="muted">Bu sipariş için kayıtlı müşteri yok.</p>
      </section>
    );
  }
  if (!customer) {
    return (
      <section className="order-summary-card">
        <header>
          <h3>Müşteri</h3>
          <span className="muted">Yüklenemedi</span>
        </header>
        <p className="muted">Müşteri bilgisi alınamadı.</p>
      </section>
    );
  }
  return (
    <section className="order-summary-card">
      <header>
        <h3>Müşteri</h3>
        <span className="muted">{customer.userId?.slice(0, 8) ?? '—'}</span>
      </header>
      <div className="order-customer">
        <div className="order-customer__avatar" aria-hidden>
          {(customer.displayName ?? 'M').slice(0, 1).toUpperCase()}
        </div>
        <div className="order-customer__main">
          <div className="order-customer__name">
            {customer.displayName ?? 'İsimsiz müşteri'}
          </div>
          {customer.phone ? (
            <div className="order-customer__contact">
              <a href={`tel:${customer.phone}`}>{customer.phone}</a>
            </div>
          ) : (
            <div className="order-customer__contact muted">Telefon yok</div>
          )}
          <div className="order-customer__badges">
            <StatusBadge tone={customer.phoneVerified ? 'ready' : 'warn'}>
              {customer.phoneVerified ? 'Telefon doğrulandı' : 'Telefon bekliyor'}
            </StatusBadge>
            {customer.pointsBalance ? (
              <StatusBadge tone="amber">
                {`${formatTryMinor(customer.pointsBalance, 'TRY')} puan`}
              </StatusBadge>
            ) : null}
          </div>
          {customer.userId ? (
            <Link href={`/customers/${customer.userId}`} className="order-customer__cta">
              Müşteri kaydını aç →
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export interface DeliveryAddressCardProps {
  order: Order;
}

export function DeliveryAddressCard({ order }: DeliveryAddressCardProps) {
  const address = order.deliveryAddressJson ?? null;
  const lat = typeof address?.latitude === 'number' ? address.latitude : null;
  const lng = typeof address?.longitude === 'number' ? address.longitude : null;
  const line1 = typeof address?.line1 === 'string' ? address.line1 : null;
  const hasGeo = lat !== null && lng !== null;
  const mapHref = hasGeo
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
    : null;
  return (
    <section className="order-summary-card">
      <header>
        <h3>Teslimat</h3>
        <span className="muted">
          {order.fulfillmentMode === 'PICKUP' ? 'Gel-al' : 'Teslimat'}
        </span>
      </header>
      {order.deliveryNote ? (
        <p className="order-delivery-address__note">
          <strong>Not:</strong> {order.deliveryNote}
        </p>
      ) : (
        <p className="muted">Müşteri teslimat notu bırakmadı.</p>
      )}
      {line1 ? (
        <div className="order-delivery-address__body">
          <p className="order-delivery-address__line">{line1}</p>
          {hasGeo ? (
            <p className="muted mono order-delivery-address__coords">
              {lat?.toFixed(4)} · {lng?.toFixed(4)}
            </p>
          ) : null}
          <div className="order-delivery-address__actions">
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noreferrer"
                className="ops-btn ops-btn--ghost"
              >
                Haritada aç
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="muted">Bu sipariş için teslimat adresi yok.</p>
      )}
    </section>
  );
}

export interface PaymentCardProps {
  payment: {
    id?: string;
    status?: string | null;
    amountMinor?: string | null;
    currency?: string | null;
    providerPaymentId?: string | null;
    checkoutSessionId?: string | null;
  } | null;
}

export function PaymentCard({ payment }: PaymentCardProps) {
  if (!payment || !payment.id) {
    return (
      <section className="order-summary-card">
        <header>
          <h3>Ödeme</h3>
          <span className="muted">Eşleşmedi</span>
        </header>
        <p className="muted">
          <code>checkoutSessionId</code> ile eşleşen bir ödeme kaydı bulunamadı.
        </p>
      </section>
    );
  }
  return (
    <section className="order-summary-card">
      <header>
        <h3>Ödeme</h3>
        <StatusBadge tone={paymentTone(payment.status ?? null)}>
          {paymentLabel(payment.status ?? null)}
        </StatusBadge>
      </header>
      <div className="order-payment-rows">
        <div>
          <span className="muted">Sağlayıcı</span>
          <span className="mono">iyzico</span>
        </div>
        <div>
          <span className="muted">Tutar</span>
          <span className="mono">
            {formatTryMinor(payment.amountMinor ?? '0', payment.currency ?? 'TRY')}
          </span>
        </div>
        <div>
          <span className="muted">Sağlayıcı ödeme no</span>
          <span className="mono">{payment.providerPaymentId ?? '—'}</span>
        </div>
        {payment.id ? (
          <Link
            href={`/payments/${payment.id}`}
            className="ops-btn ops-btn--ghost order-payment-cta"
          >
            Ödeme kaydına git
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export interface BranchAssignmentsCardProps {
  order: Order;
}

export function BranchAssignmentsCard({ order }: BranchAssignmentsCardProps) {
  const assignments = order.branchAssignments ?? [];
  return (
    <section className="order-summary-card">
      <header>
        <h3>Şube atamaları</h3>
        <span className="muted">{assignments.length} kayıt</span>
      </header>
      {assignments.length === 0 ? (
        <p className="muted">Bu sipariş için ek şube ataması yok.</p>
      ) : (
        <ul className="order-branch-list">
          {assignments.map((assignment) => (
            <li key={assignment.id ?? `${assignment.branchId}-${assignment.createdAt}`}>
              <span className="mono">
                {assignment.branchId ? shortId(assignment.branchId) : '—'}
              </span>
              <span className="muted">{formatOpsDateTime(assignment.createdAt)}</span>
              <span>{assignment.reason ?? '—'}</span>
              {assignment.assignedBy ? (
                <span className="muted">aktör {shortId(assignment.assignedBy)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface OrderItemsGridProps {
  order: Order;
  currency: string;
  selectedItemIds: ReadonlySet<string>;
  onToggleItem: (itemId: string, selected: boolean) => void;
  onSetSelectedItems: (itemIds: string[]) => void;
}

export function OrderItemsGrid({
  order,
  currency,
  selectedItemIds,
  onToggleItem,
  onSetSelectedItems,
}: OrderItemsGridProps) {
  const items = useMemo(() => order.items ?? [], [order.items]);
  const selectableIds = useMemo(
    () => items.map((item) => item.id).filter((id): id is string => Boolean(id)),
    [items],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedItemIds.has(id));

  return (
    <section className="order-summary-card">
      <header>
        <h3>Kalemler</h3>
        <div className="order-items-head-actions">
          <span className="muted">
            {selectedItemIds.size > 0
              ? `${selectedItemIds.size}/${items.length} seçili`
              : `${items.length} kalem`}
          </span>
          {selectableIds.length > 0 ? (
            <button
              type="button"
              className="ops-btn ops-btn--ghost"
              onClick={() => {
                onSetSelectedItems(allSelected ? [] : selectableIds);
              }}
            >
              {allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
            </button>
          ) : null}
        </div>
      </header>
      {items.length === 0 ? (
        <p className="muted">Bu siparişte kalem yok.</p>
      ) : (
        <div className="order-items-grid">
          {items.map((item, index) => {
            const itemId = item.id ?? String(index);
            const selected = Boolean(item.id && selectedItemIds.has(item.id));
            const paidExtras = (item.modifiers ?? []).filter((mod) => {
              if (!mod.priceDeltaMinorSnapshot) return false;
              return BigInt(mod.priceDeltaMinorSnapshot) > 0n;
            });
            const extrasTotal = paidExtras.reduce<bigint>(
              (acc, mod) =>
                mod.priceDeltaMinorSnapshot
                  ? acc + BigInt(mod.priceDeltaMinorSnapshot)
                  : acc,
              0n,
            );
            return (
              <article
                key={itemId}
                className={`order-item-card${selected ? ' order-item-card--selected' : ''}`}
              >
                <header>
                  <label className="order-item-card__select">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!item.id}
                      onChange={(event) => {
                        if (item.id) onToggleItem(item.id, event.target.checked);
                      }}
                      aria-label={`${item.productNameSnapshot ?? 'Kalem'} iade için seç`}
                    />
                    <div>
                      <h4>{item.productNameSnapshot ?? 'Kalem'}</h4>
                      <span className="muted">
                        {item.quantity ?? 1} ×{' '}
                        {formatTryMinor(item.unitPriceMinorSnapshot ?? '0', currency)}
                      </span>
                    </div>
                  </label>
                  <span className="mono order-item-card__total">
                    {formatTryMinor(item.lineGrossMinorSnapshot ?? '0', currency)}
                  </span>
                </header>
                {(item.modifiers ?? []).length > 0 ? (
                  <div className="order-item-card__chips">
                    {(item.modifiers ?? []).map((mod, idx) => {
                      const delta = mod.priceDeltaMinorSnapshot
                        ? BigInt(mod.priceDeltaMinorSnapshot)
                        : 0n;
                      const paid = delta > 0n;
                      return (
                        <span
                          key={`m-${idx}`}
                          className={`ops-chip ${paid ? 'ops-chip--paid' : 'ops-chip--muted'}`}
                        >
                          {mod.nameSnapshot ?? 'Modifiye'}
                          <span className="mono">
                            {paid
                              ? `+${formatTryMinor(
                                  mod.priceDeltaMinorSnapshot ?? '0',
                                  currency,
                                )}`
                              : 'ücretsiz'}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                {(item.removals ?? []).length > 0 ? (
                  <div className="order-item-card__chips order-item-card__chips--muted">
                    {(item.removals ?? []).map((removal, idx) => (
                      <span key={`r-${idx}`} className="ops-chip">
                        <s>{removal.nameSnapshot ?? 'Çıkarıldı'}</s>
                      </span>
                    ))}
                  </div>
                ) : null}
                {paidExtras.length > 0 ? (
                  <p className="order-item-card__extras">
                    {paidExtras.length} ek malzeme ·{' '}
                    {formatTryMinor(extrasTotal.toString(), currency)}
                  </p>
                ) : null}
                <footer>
                  <span className="muted">
                    {typeof item.productVariantId === 'string' &&
                    item.productVariantId.length > 0
                      ? `Varyant: ${shortId(item.productVariantId)}`
                      : 'Standart varyant'}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export interface OrderAuditTrailProps {
  order: Order;
}

export interface AuditEntry {
  id: string;
  label: string;
  timestamp: string;
  actor: string;
}

const EVENT_TYPE_LABEL_TR: Record<string, string> = {
  OrderCreated: 'Sipariş oluşturuldu',
  OrderStatusChanged: 'Durum değişti',
  OrderBranchAssigned: 'Şube atandı',
  OrderBranchReassigned: 'Şube yeniden atandı',
};

function eventTypeLabelTr(eventType: string | null | undefined): string {
  if (!eventType) return 'Olay';
  return EVENT_TYPE_LABEL_TR[eventType] ?? eventType;
}

export function buildAuditEntries(order: Order): AuditEntry[] {
  return (order.events ?? [])
    .slice()
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((event) => {
      const typeLabel = eventTypeLabelTr(event.eventType);
      let label = typeLabel;
      if (event.fromStatus && event.toStatus) {
        label = `${typeLabel}: ${orderStatusLabel(event.fromStatus)} → ${orderStatusLabel(event.toStatus)}`;
      } else if (event.toStatus) {
        label = `${typeLabel}: ${orderStatusLabel(event.toStatus)}`;
      }
      return {
        id: event.id,
        label,
        timestamp: event.createdAt ?? new Date().toISOString(),
        actor:
          typeof event.actorUserId === 'string' ? shortId(event.actorUserId) : 'sistem',
      };
    });
}

export function OrderAuditTrail({ order }: OrderAuditTrailProps) {
  const entries = useMemo(() => buildAuditEntries(order), [order]);
  return (
    <section className="order-summary-card">
      <header>
        <h3>Denetim kaydı</h3>
        <span className="muted">{entries.length} olay</span>
      </header>
      {entries.length === 0 ? (
        <p className="muted">Bu sipariş için henüz kayıt yok.</p>
      ) : (
        <ol className="order-audit-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className="order-audit-list__dot" aria-hidden />
              <div>
                <span>{entry.label}</span>
                <span className="muted">
                  {formatOpsDateTime(entry.timestamp)} · aktör {entry.actor}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export interface OrderFinancialCardProps {
  order: Order;
  extraModifiersCount: number;
}

export function OrderFinancialCard({ order, extraModifiersCount }: OrderFinancialCardProps) {
  const currency = order.currency ?? 'TRY';
  return (
    <section className="order-summary-card">
      <header>
        <h3>Finansal dağılım</h3>
        <span className="muted">{currency}</span>
      </header>
      <div className="order-financial-rows">
        <div>
          <span>Ürün (net)</span>
          <span className="mono">
            {formatTryMinor(order.merchandiseNetMinor ?? '0', currency)}
          </span>
        </div>
        {extraModifiersCount > 0 ? (
          <div>
            <span>Ek malzemeler</span>
            <span className="mono muted">{extraModifiersCount} kalem</span>
          </div>
        ) : null}
        <div>
          <span>Teslimat</span>
          <span className="mono">
            {formatTryMinor(order.deliveryFeeMinor ?? '0', currency)}
          </span>
        </div>
        {BigInt(order.loyaltyRedeemedMinor ?? '0') > 0n ? (
          <div>
            <span>Sadakat puanı</span>
            <span className="mono">
              - {formatTryMinor(order.loyaltyRedeemedMinor ?? '0', currency)}
            </span>
          </div>
        ) : null}
        {BigInt(order.tipMinor ?? '0') > 0n ? (
          <div>
            <span>Bahşiş</span>
            <span className="mono">
              {formatTryMinor(order.tipMinor ?? '0', currency)}
            </span>
          </div>
        ) : null}
        {BigInt(order.pickupDiscountMinor ?? '0') > 0n ? (
          <div>
            <span>Gel-al indirimi</span>
            <span className="mono">
              - {formatTryMinor(order.pickupDiscountMinor ?? '0', currency)}
            </span>
          </div>
        ) : null}
        <div className="order-financial-rows__total">
          <strong>Ödenecek</strong>
          <strong className="mono">
            {formatTryMinor(order.finalPayableMinor ?? '0', currency)}
          </strong>
        </div>
      </div>
    </section>
  );
}

export interface OrderOperationsPanelProps {
  order: Order;
  nextStatuses: readonly string[];
  transitionTarget: string;
  onTransitionChange: (value: string) => void;
  transitionReason: string;
  onReasonChange: (value: string) => void;
  canReassignBranch: boolean;
  branches: ReadonlyArray<{ id: string; name: string }>;
  reassignId: string;
  onReassignChange: (value: string) => void;
  paymentId: string | null;
  refundAmount: string;
  onRefundAmountChange: (value: string) => void;
  canAssignCourier: boolean;
  couriers: ReadonlyArray<{ id: string; displayName?: string }>;
  courierId: string;
  onCourierChange: (value: string) => void;
  onApplyTransition: () => void;
  onApplyReassign: () => void;
  onApplyRefund: () => void;
  onApplyCourier: () => void;
  busy: boolean;
  actionLabels: Record<string, string>;
}

export function OrderOperationsPanel(props: OrderOperationsPanelProps) {
  const {
    order,
    nextStatuses,
    transitionTarget,
    onTransitionChange,
    transitionReason,
    onReasonChange,
    canReassignBranch,
    branches,
    reassignId,
    onReassignChange,
    paymentId,
    refundAmount,
    onRefundAmountChange,
    canAssignCourier,
    couriers,
    courierId,
    onCourierChange,
    onApplyTransition,
    onApplyReassign,
    onApplyRefund,
    onApplyCourier,
    busy,
    actionLabels,
  } = props;
  return (
    <section className="order-operations-panel">
      <header>
        <h3>Operasyonel aksiyonlar</h3>
        <span className="muted">{orderStatusLabel(order.status)}</span>
      </header>
      <div className="order-operations-grid">
        <div className="order-operations-grid__cell">
          <span className="order-operations-grid__label">Geçiş</span>
          <select
            className="ops-select"
            aria-label="Yeni durum"
            value={transitionTarget}
            onChange={(event) => onTransitionChange(event.target.value)}
            disabled={nextStatuses.length === 0 || busy}
          >
            {nextStatuses.length === 0 ? (
              <option value="">Uygulanabilir geçiş yok</option>
            ) : (
              nextStatuses.map((code) => (
                <option key={code} value={code}>
                  {actionLabels[code] ?? orderStatusLabel(code)}
                </option>
              ))
            )}
          </select>
          <input
            className="ops-input"
            placeholder="Gerekçe (opsiyonel)"
            value={transitionReason}
            onChange={(event) => onReasonChange(event.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="ops-btn ops-btn--primary"
            onClick={onApplyTransition}
            disabled={busy || !transitionTarget}
          >
            Geçişi uygula
          </button>
        </div>

        {canReassignBranch ? (
          <div className="order-operations-grid__cell">
            <span className="order-operations-grid__label">Şube</span>
            <select
              className="ops-select"
              aria-label="Yeniden ata şube"
              value={reassignId}
              onChange={(event) => onReassignChange(event.target.value)}
              disabled={busy}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ops-btn ops-btn--ghost"
              onClick={onApplyReassign}
              disabled={busy}
            >
              Şubeyi ata
            </button>
          </div>
        ) : null}

        {paymentId ? (
          <div className="order-operations-grid__cell">
            <span className="order-operations-grid__label">İade</span>
            <input
              className="ops-input"
              value={refundAmount}
              onChange={(event) => onRefundAmountChange(event.target.value)}
              inputMode="numeric"
              aria-label="İade tutarı (kuruş)"
              placeholder="kuruş"
              disabled={busy}
            />
            <button
              type="button"
              className="ops-btn ops-btn--danger"
              onClick={onApplyRefund}
              disabled={busy}
            >
              İade başlat
            </button>
          </div>
        ) : null}

        {canAssignCourier ? (
          <div className="order-operations-grid__cell">
            <span className="order-operations-grid__label">Kurye</span>
            <select
              className="ops-select"
              aria-label="Kurye seç"
              value={courierId}
              onChange={(event) => onCourierChange(event.target.value)}
              disabled={busy}
            >
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName ?? shortId(c.id)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ops-btn ops-btn--ghost"
              onClick={onApplyCourier}
              disabled={busy || !courierId}
            >
              Kurye ata
            </button>
          </div>
        ) : (
          <div className="order-operations-grid__cell">
            <span className="order-operations-grid__label">Kurye</span>
            <p className="muted">Kurye ataması yalnızca Paketlendi durumunda açılır.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export interface RefundCalculatorProps {
  order: Order;
  selectedItemIds: ReadonlySet<string>;
  orderCurrency: string;
  busy: boolean;
  onApply: (amountMinor: string) => void;
}

export function sumSelectedItemsMinor(
  order: Order,
  selectedItemIds: ReadonlySet<string>,
): bigint {
  return (order.items ?? []).reduce<bigint>((acc, item) => {
    if (!item.id || !selectedItemIds.has(item.id)) return acc;
    const line = item.lineGrossMinorSnapshot
      ? BigInt(item.lineGrossMinorSnapshot)
      : 0n;
    return acc + line;
  }, 0n);
}

export function RefundCalculator(props: RefundCalculatorProps) {
  const { order, selectedItemIds, orderCurrency, busy, onApply } = props;
  const selectedCount = selectedItemIds.size;
  const amountMinor = useMemo(
    () => sumSelectedItemsMinor(order, selectedItemIds),
    [order, selectedItemIds],
  );
  const amountStr = amountMinor.toString();
  const canApply = selectedCount > 0 && amountMinor > 0n && !busy;

  return (
    <section className="order-summary-card">
      <header>
        <h3>İade hesap makinesi</h3>
        <span className="muted">{orderCurrency}</span>
      </header>
      <div className="order-refund-summary">
        <div>
          <span className="muted">Seçili kalem</span>
          <strong className="mono">{selectedCount}</strong>
        </div>
        <div>
          <span className="muted">Hesaplanan iade</span>
          <strong className="mono">
            {formatTryMinor(amountStr, orderCurrency)}
          </strong>
        </div>
      </div>
      <p className="muted">
        İade tutarı, aşağıdaki listeden iptal edilecek ürünler seçilerek
        otomatik hesaplanır. Seçim yaptıktan sonra iadeyi uygulayın.
      </p>
      <button
        type="button"
        className="ops-btn ops-btn--primary"
        onClick={() => onApply(amountStr)}
        disabled={!canApply}
      >
        Seçilenleri iade et
        {selectedCount > 0 ? (
          <span className="mono">
            · {formatTryMinor(amountStr, orderCurrency)}
          </span>
        ) : null}
      </button>
    </section>
  );
}
