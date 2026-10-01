'use client';

import { useSyncExternalStore } from 'react';
import type { z } from 'zod';

import { ORDER_STATUSES, railIndexForStatus } from '../../lib/order-status';
import type { orderSchema } from '../../lib/schemas';

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

export type FlowStepKind = 'primary' | 'alternative';

export interface FlowStep {
  code: string;
  label: string;
  shortLabel?: string;
  kind: FlowStepKind;
}

export interface OrderFlowRailProps {
  order: Order;
}

/**
 * Premium Sipariş İş Akışı Çizelgesi:
 *  - Ana hat 7 mutlu adım
 *  - Şu anki durum için ETA/SLA bilgisi
 *  - İptal/ret/refund gibi alternatif akışlar gerçekleşmişse ayrı dal olarak gösterilir
 *
 * Tamamen read-only; aktif adımı vurgular ama yeni backend endpoint eklemez.
 */
export function OrderFlowRail({ order }: OrderFlowRailProps) {
  const now = useSyncExternalStore(subscribe, nowTick, getServerSnapshot);
  const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : 0;
  const ageMinutes = createdMs ? Math.max(0, Math.floor((now - createdMs) / 60_000)) : 0;

  const primary: FlowStep[] = [
    { code: 'PREPARING', label: 'Hazırlanıyor', kind: 'primary' },
    { code: 'READY_FOR_COURIER', label: 'Paketlendi', kind: 'primary' },
    { code: 'COURIER_ASSIGNED', label: 'Kurye atandı', kind: 'primary' },
    { code: 'ON_THE_WAY', label: 'Yolda', kind: 'primary' },
    { code: 'DELIVERED', label: 'Teslim edildi', kind: 'primary' },
  ];

  const alternatives: FlowStep[] = [
    { code: 'REJECTED', label: 'Şube reddetti', kind: 'alternative' },
    { code: 'CANCELLED', label: 'İptal edildi', kind: 'alternative' },
    { code: 'REFUND_PENDING', label: 'İade bekliyor', kind: 'alternative' },
    { code: 'PARTIALLY_REFUNDED', label: 'Kısmi iade', kind: 'alternative' },
    { code: 'REFUNDED', label: 'İade tamamlandı', kind: 'alternative' },
  ];

  const primaryIndex = primary.findIndex((step) => step.code === order.status);
  const alternative = alternatives.find((step) => step.code === order.status);

  const slaMinutesByStep: Record<string, number | null> = {
    PREPARING: 14,
    READY_FOR_COURIER: 6,
    COURIER_ASSIGNED: 5,
    ON_THE_WAY: 25,
    DELIVERED: 0,
  };

  const sla =
    primaryIndex >= 0 ? (slaMinutesByStep[primary[primaryIndex]?.code ?? ''] ?? null) : null;
  const slaBreached = sla !== null && sla !== 0 && ageMinutes > sla;

  const totalSpan = primary.length;
  const activeIndex = railIndexForStatus(order.status);

  return (
    <section className="order-flow-rail" aria-label="Sipariş iş akışı">
      <div className="order-flow-rail__primary">
        <div
          className="order-flow-rail__fill"
          style={{ width: `${(activeIndex / totalSpan) * 100}%` }}
        />
        {primary.map((step, index) => {
          // `completed` means the step has fully finished; the active
          // step is in-progress and should NOT carry `is-completed`.
          const completed = index < activeIndex;
          const active = index === activeIndex;
          const stepSla = slaMinutesByStep[step.code] ?? null;
          const breached = active && stepSla !== null && stepSla !== 0 && ageMinutes > stepSla;
          return (
            <div
              key={step.code}
              className={`order-flow-rail__step ${completed ? 'is-completed' : ''} ${
                active ? 'is-active' : ''
              } ${breached ? 'is-breach' : ''}`}
              data-code={step.code}
            >
              <span className="order-flow-rail__step-index">{index + 1}</span>
              <span className="order-flow-rail__step-label">{step.label}</span>
              {stepSla !== null && stepSla > 0 ? (
                <span className={`order-flow-rail__step-sla ${breached ? 'is-breach' : ''}`}>
                  {breached ? `SLA aşıldı · ${ageMinutes} dk` : `SLA ${stepSla} dk`}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="order-flow-rail__meta">
        <span>
          Sipariş yaşı · <strong>{ageMinutes} dk</strong>
        </span>
        {slaBreached ? <span className="order-flow-rail__chip is-breach">SLA aşıldı</span> : null}
        {alternative ? (
          <span className={`order-flow-rail__chip is-alt code-${alternative.code}`}>
            Alternatif akış: {alternative.label}
          </span>
        ) : null}
      </div>
    </section>
  );
}

/** Backend state-machine için bilinen tüm durumlar; harici tüketiciler için export. */
export const ALL_ORDER_STATUSES = ORDER_STATUSES;
