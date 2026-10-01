'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useEffect, useRef } from 'react';
import type { z } from 'zod';

import { shortId } from '../../lib/ops-time';
import { orderStatusLabel, orderStatusTone } from '../../lib/order-status';
import type { orderSchema } from '../../lib/schemas';

import styles from './order-items-dialog.module.css';

type Order = z.infer<typeof orderSchema>;

export function OrderItemsDialog(props: { order: Order | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (props.order && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!props.order && dialog.open) {
      dialog.close();
    }
  }, [props.order]);

  const order = props.order;
  const items = order?.items ?? [];
  const currency = order?.currency ?? 'TRY';
  const totalQuantity = items.reduce((count, item) => count + (item.quantity ?? 1), 0);
  const orderNumber = order?.displayNumber || (order ? shortId(order.id) : '');

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-admin-theme="kitchen-fleet"
      aria-labelledby="order-items-title"
      onClose={props.onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {order ? (
        <>
          <header className={styles.header}>
            <div className={styles.orderHeading}>
              <span className={styles.eyebrow}>Sipariş detayı</span>
              <h2 id="order-items-title">{orderNumber}</h2>
            </div>
            <div className={styles.headerActions}>
              <span className={styles.status} data-tone={orderStatusTone(order.status)}>
                <span aria-hidden="true" />
                {orderStatusLabel(order.status)}
              </span>
              <button
                ref={closeRef}
                type="button"
                className={styles.close}
                aria-label="Sipariş detayını kapat"
                onClick={close}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
          </header>

          <section className={styles.body} aria-label="Sipariş ürünleri">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionKicker}>İÇERİK</span>
                <h3>Sipariş kalemleri</h3>
              </div>
              <span className={styles.itemSummary}>
                {items.length} kalem <i aria-hidden="true">·</i> {totalQuantity} adet
              </span>
            </div>

            {items.length > 0 ? (
              <ul className={styles.items}>
                {items.map((item, index) => {
                  const hasLineTotal = Boolean(item.lineGrossMinorSnapshot);
                  const amount = hasLineTotal
                    ? item.lineGrossMinorSnapshot
                    : item.unitPriceMinorSnapshot;
                  const notes = [
                    ...(item.modifiers ?? []).map((modifier) => modifier.nameSnapshot ?? 'Ek ürün'),
                    ...(item.removals ?? []).map(
                      (removal) => `Çıkarıldı: ${removal.nameSnapshot ?? 'Ürün'}`,
                    ),
                  ];

                  return (
                    <li className={styles.item} key={item.id ?? `${order.id}-${index}`}>
                      <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
                      <div className={styles.itemCopy}>
                        <strong>{item.productNameSnapshot ?? 'Kalem'}</strong>
                        {notes.length > 0 ? <span>{notes.join(' · ')}</span> : null}
                        {amount ? (
                          <small>{hasLineTotal ? 'Satır tutarı' : 'Birim fiyat'}</small>
                        ) : null}
                      </div>
                      <div className={styles.itemPrice}>
                        <span>× {item.quantity ?? 1}</span>
                        <strong>{amount ? formatTryMinor(amount, currency) : '—'}</strong>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>Bu sipariş için ürün detayı bulunamadı.</p>
            )}
          </section>

          <footer className={styles.footer}>
            <span>Sipariş toplamı</span>
            <strong>
              {order.finalPayableMinor ? formatTryMinor(order.finalPayableMinor, currency) : '—'}
            </strong>
          </footer>
        </>
      ) : null}
    </dialog>
  );
}
