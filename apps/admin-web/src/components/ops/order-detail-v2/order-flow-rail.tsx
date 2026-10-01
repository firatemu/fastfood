'use client';

import { useSyncExternalStore } from 'react';
import type { z } from 'zod';

import { orderStatusLabel, railIndexForStatus } from '../../../lib/order-status';
import type { orderSchema } from '../../../lib/schemas';

type Order = z.infer<typeof orderSchema>;

const SUBSCRIBERS = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

function subscribe(onChange: () => void): () => void {
  SUBSCRIBERS.add(onChange);
  if (typeof window !== 'undefined' && interval == null) {
    interval = setInterval(() => {
      for (const cb of SUBSCRIBERS) cb();
    }, 30_000);
  }
  return () => {
    SUBSCRIBERS.delete(onChange);
    if (SUBSCRIBERS.size === 0 && interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}

function nowTick(): number {
  return Date.now();
}

function getServerSnapshot(): number {
  return 0;
}

interface FlowStep {
  code: string;
  label: string;
}

const PRIMARY_STEPS: FlowStep[] = [
  { code: 'PREPARING', label: 'Hazırlanıyor' },
  { code: 'READY_FOR_COURIER', label: 'Paketlendi' },
  { code: 'COURIER_ASSIGNED', label: 'Kurye atandı' },
  { code: 'ON_THE_WAY', label: 'Yolda' },
  { code: 'DELIVERED', label: 'Teslim edildi' },
];

const SLA_MINUTES_BY_STEP: Record<string, number | null> = {
  PREPARING: 14,
  READY_FOR_COURIER: 6,
  COURIER_ASSIGNED: 5,
  ON_THE_WAY: 25,
  DELIVERED: 0,
};

const ALTERNATIVE_BRANCHES: Record<string, string> = {
  REJECTED: 'Şube reddetti',
  CANCELLED: 'İptal edildi',
  REFUND_PENDING: 'İade bekliyor',
  PARTIALLY_REFUNDED: 'Kısmi iade uygulandı',
  REFUNDED: 'İade tamamlandı',
};

export interface OrderFlowRailProps {
  order: Order;
}

/**
 * Premium sipariş iş akışı çizelgesi.
 *
 *  - 7 ana adım (happy-path)
 *  - Aktif adımda SLA tahmini ve yaş rozeti
 *  - İptal/ret/refund gibi alternatif dallar ayrı chip olarak görünür
 */
export function OrderFlowRail({ order }: OrderFlowRailProps) {
  const now = useSyncExternalStore(subscribe, nowTick, getServerSnapshot);
  const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : 0;
  const ageMinutes = createdMs ? Math.max(0, Math.floor((now - createdMs) / 60_000)) : 0;
  const primaryIndex = PRIMARY_STEPS.findIndex((step) => step.code === order.status);
  const activeIndex = railIndexForStatus(order.status);
  const activeStep = primaryIndex >= 0 ? PRIMARY_STEPS[primaryIndex] : undefined;
  const activeSla = activeStep ? (SLA_MINUTES_BY_STEP[activeStep.code] ?? null) : null;
  const slaBreached = activeSla !== null && activeSla > 0 && ageMinutes > activeSla;
  const alternativeLabel = ALTERNATIVE_BRANCHES[order.status];

  return (
    <section className="order-flow-rail" aria-label="Sipariş iş akışı">
      <header className="order-flow-rail__head">
        <div>
          <span className="muted">Sipariş yaşı</span>
          <strong>{ageMinutes} dk</strong>
        </div>
        {activeSla !== null && activeSla > 0 ? (
          <div className={slaBreached ? 'is-breach' : ''}>
            <span className="muted">Aktif adım SLA</span>
            <strong>{activeSla} dk</strong>
            {slaBreached ? <em>· süre aşıldı</em> : null}
          </div>
        ) : null}
        {alternativeLabel ? (
          <div className="order-flow-rail__alt">
            <span className="muted">Alternatif akış</span>
            <strong>{alternativeLabel}</strong>
          </div>
        ) : (
          <div className="muted">Durum: {orderStatusLabel(order.status)}</div>
        )}
      </header>
      <div className="order-flow-rail__primary">
        <div
          className="order-flow-rail__fill"
          style={{ width: `${(activeIndex / PRIMARY_STEPS.length) * 100}%` }}
        />
        {PRIMARY_STEPS.map((step, index) => {
          // `completed` means the step has fully finished; the active
          // step is in-progress and should NOT carry `is-completed`.
          // This prevents the "completed" amber styling from
          // overriding the active step's outline.
          const completed = index < activeIndex;
          const active = index === activeIndex;
          const breached = active && activeSla !== null && activeSla > 0 && ageMinutes > activeSla;
          return (
            <div
              key={step.code}
              className={`order-flow-rail__step ${completed ? 'is-completed' : ''} ${active ? 'is-active' : ''} ${breached ? 'is-breach' : ''}`}
              data-code={step.code}
            >
              <span className="order-flow-rail__step-index">{index + 1}</span>
              <span className="order-flow-rail__step-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
