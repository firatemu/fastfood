'use client';

import { formatTryMinor } from '@fastfood/contracts';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';
import type { z } from 'zod';

import { formatOpsDateTime } from '../../lib/ops-time';
import { orderStatusLabel } from '../../lib/order-status';
import type { orderSchema } from '../../lib/schemas';

type Order = z.infer<typeof orderSchema>;

export interface OrderReceiptProps {
  order: Order;
  variant?: 'standard' | 'kitchen';
  pickupToken?: string;
  pickupPrefix?: string;
  pickupExpiresAt?: string;
  courierScanUrl?: string;
}

/**
 * Renders an 80mm thermal receipt inside a fixed-width print sheet.
 * Designed for `window.print()` with a dedicated `@media print`
 * stylesheet that hides the rest of the chrome.
 *
 * The QR encodes the courier scan URL (preferred) or the raw token as a
 * fallback. The 1D barcode below it always renders the pickup prefix so
 * legacy laser scanners can read the same value.
 */
export function OrderReceipt(props: OrderReceiptProps) {
  const {
    order,
    variant = 'standard',
    pickupToken,
    pickupPrefix,
    pickupExpiresAt,
    courierScanUrl,
  } = props;
  const kitchenCopy = variant === 'kitchen';
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const qrPayload = courierScanUrl
    ? courierScanUrl
    : pickupToken
      ? `PICKUP:${pickupToken}`
      : (pickupPrefix ?? order.displayNumber ?? order.id);

  const barcodePayload = pickupPrefix ?? order.displayNumber ?? order.id.slice(0, 12);

  useEffect(() => {
    if (!qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, qrPayload, {
      margin: 0,
      width: 140,
      errorCorrectionLevel: 'M',
    }).catch((err) => console.warn('QR render failed', err));
  }, [qrPayload]);

  useEffect(() => {
    if (!barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, barcodePayload, {
        format: 'CODE128',
        height: 40,
        displayValue: true,
        fontSize: 12,
        margin: 0,
      });
    } catch (err) {
      console.warn('Barcode render failed', err);
    }
  }, [barcodePayload]);

  const subtotal = order.merchandiseNetMinor ?? '0';
  const delivery = order.deliveryFeeMinor ?? '0';
  const loyalty = order.loyaltyRedeemedMinor ?? '0';
  const total = order.finalPayableMinor ?? '0';
  const currency = order.currency ?? 'TRY';
  const itemCount = (order.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  return (
    <div className="ops-receipt-sheet" aria-label="Sipariş fişi">
      <div className="ops-receipt">
        <header className="ops-receipt__brand">
          <strong>BURGER HOME</strong>
          <p className="ops-receipt__brand-sub">
            {kitchenCopy ? 'Mutfak hazırlık fişi' : 'Kurumsal Operasyon · Şube #01'}
          </p>
        </header>
        <section className="ops-receipt__meta">
          <div>
            <span>Fiş No</span>
            <strong className="mono">{order.displayNumber || shortId(order.id)}</strong>
          </div>
          <div>
            <span>Tarih</span>
            <strong className="mono">{formatOpsDateTime(order.createdAt)}</strong>
          </div>
          <div>
            <span>Kanal</span>
            <strong>{order.fulfillmentMode === 'PICKUP' ? 'Gel-al' : 'Teslimat'}</strong>
          </div>
          <div>
            <span>Durum</span>
            <strong>{orderStatusLabel(order.status)}</strong>
          </div>
        </section>
        {!kitchenCopy || order.deliveryNote ? (
          <section className="ops-receipt__customer">
            {!kitchenCopy ? (
              <>
                <div>
                  <span>Müşteri</span>
                  <strong>{order.customer?.displayName?.trim() || 'Misafir'}</strong>
                </div>
                <div>
                  <span>Telefon</span>
                  <strong className="mono">{order.customer?.phone?.trim() || '—'}</strong>
                </div>
                {order.deliveryAddressJson?.line1 ? (
                  <div>
                    <span>Adres</span>
                    <strong>{order.deliveryAddressJson.line1}</strong>
                  </div>
                ) : null}
              </>
            ) : null}
            {order.deliveryNote ? (
              <div>
                <span>Not</span>
                <strong>{order.deliveryNote}</strong>
              </div>
            ) : null}
          </section>
        ) : null}
        <table className="ops-receipt__items">
          <thead>
            <tr>
              <th>Kalem</th>
              <th>Adet</th>
              {!kitchenCopy ? <th>Tutar</th> : null}
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item, index) => {
              const modifiers = item.modifiers ?? [];
              const removals = item.removals ?? [];
              const paidExtras = modifiers.filter((mod) => {
                if (!mod.priceDeltaMinorSnapshot) return false;
                return BigInt(mod.priceDeltaMinorSnapshot) > 0n;
              });
              const extrasTotalMinor = paidExtras.reduce<bigint>(
                (acc, mod) =>
                  mod.priceDeltaMinorSnapshot ? acc + BigInt(mod.priceDeltaMinorSnapshot) : acc,
                0n,
              );
              return (
                <tr key={item.id ?? `${index}`}>
                  <td>
                    <div className="ops-receipt__item-name">
                      {item.productNameSnapshot ?? 'Kalem'}
                    </div>
                    {modifiers.length > 0 ? (
                      <ul className="ops-receipt__mods">
                        {modifiers.map((mod, idx) => {
                          const delta = mod.priceDeltaMinorSnapshot
                            ? BigInt(mod.priceDeltaMinorSnapshot)
                            : 0n;
                          const paid = delta > 0n;
                          return (
                            <li
                              key={`m-${idx}`}
                              className={paid ? 'ops-receipt__mod--paid' : 'ops-receipt__mod'}
                            >
                              <span className="ops-receipt__mod-label">
                                + {mod.nameSnapshot ?? 'Modifiye'}
                              </span>
                              {!kitchenCopy ? (
                                <span className="ops-receipt__mod-price mono">
                                  {paid
                                    ? `+${formatTryMinor(mod.priceDeltaMinorSnapshot ?? '0', currency)}`
                                    : 'ücretsiz'}
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    {removals.length > 0 ? (
                      <ul className="ops-receipt__mods ops-receipt__mods--muted">
                        {removals.map((removal, idx) => (
                          <li key={`r-${idx}`}>− {removal.nameSnapshot ?? 'Çıkarıldı'}</li>
                        ))}
                      </ul>
                    ) : null}
                    {!kitchenCopy && paidExtras.length > 0 ? (
                      <p className="ops-receipt__extras-total mono">
                        {paidExtras.length} ek malzeme ·{' '}
                        {formatTryMinor(extrasTotalMinor.toString(), currency)}
                      </p>
                    ) : null}
                  </td>
                  <td className="num">{item.quantity ?? 1}</td>
                  {!kitchenCopy ? (
                    <td className="num">
                      {formatTryMinor(item.lineGrossMinorSnapshot ?? '0', currency)}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!kitchenCopy ? (
          <section className="ops-receipt__totals">
            <div>
              <span>Ürün</span>
              <span className="mono">{formatTryMinor(subtotal, currency)}</span>
            </div>
            <div>
              <span>Teslimat</span>
              <span className="mono">{formatTryMinor(delivery, currency)}</span>
            </div>
            <div>
              <span>Sadakat</span>
              <span className="mono">- {formatTryMinor(loyalty, currency)}</span>
            </div>
            <div className="ops-receipt__total-row">
              <strong>Toplam</strong>
              <strong className="mono">{formatTryMinor(total, currency)}</strong>
            </div>
          </section>
        ) : null}
        {!kitchenCopy ? (
          <footer className="ops-receipt__codes">
            <div className="ops-receipt__qr">
              <canvas ref={qrCanvasRef} width={140} height={140} aria-hidden />
              <p className="mono">{qrPayload}</p>
            </div>
            <div className="ops-receipt__barcode">
              <svg ref={barcodeRef} />
              <p className="mono">{barcodePayload}</p>
            </div>
            <p className="ops-receipt__hint">
              Kurye fişi okutarak ürünleri teslim alabilir · Toplam kalem {itemCount}
            </p>
            {pickupPrefix && pickupExpiresAt ? (
              <p className="ops-receipt__expiry mono">
                Token {pickupPrefix} · {formatOpsDateTime(pickupExpiresAt)} tarihine kadar geçerli.
              </p>
            ) : null}
          </footer>
        ) : null}
        <p className="ops-receipt__footnote">
          {kitchenCopy
            ? 'Mutfak kopyası · Bu fiş operasyonel amaçlıdır, mali değildir.'
            : 'BURGER HOME HQ Control Plane · Bu fiş operasyonel amaçlıdır, mali değildir.'}
        </p>
      </div>
    </div>
  );
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
