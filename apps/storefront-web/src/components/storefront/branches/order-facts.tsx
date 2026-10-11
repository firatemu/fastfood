'use client';

import { formatPriceMinor } from '../../../lib/money';
import type { NetworkFacts } from '../../../lib/storefront/branch-finder';
import { MaterialIcon } from '../material-icon';

function Fact({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2">
        <MaterialIcon name={icon} className="text-base text-secondary-container" />
        <span className="font-label-sm uppercase tracking-[0.14em] text-on-surface-variant">
          {label}
        </span>
      </span>
      <span className="mt-1 block font-mono text-sm tabular-nums text-on-surface">{value}</span>
    </>
  );
  return href ? (
    <a href={href} className="block transition-colors hover:text-secondary-container">
      {body}
    </a>
  ) : (
    <div>{body}</div>
  );
}

/**
 * Every branch shares these numbers, so they are stated once here instead of
 * being repeated on all 14 tickets.
 */
export function OrderFacts({ facts, eta }: { facts: NetworkFacts; eta: string | null }) {
  return (
    <section
      aria-label="Sipariş kuralları"
      data-ff-order-facts
      className="rounded-2xl border border-outline-variant/25 bg-surface-container-low px-space-lg py-space-md"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="font-label-md uppercase tracking-[0.18em] text-secondary-container">
          Sipariş kuralları
        </p>
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
          {facts.minOrderMinor ? (
            <Fact
              icon="shopping_bag"
              label="Min. sepet"
              value={formatPriceMinor(facts.minOrderMinor, 'TRY')}
            />
          ) : null}
          {facts.deliveryFeeMinor ? (
            <Fact
              icon="local_shipping"
              label="Teslimat ücreti"
              value={formatPriceMinor(facts.deliveryFeeMinor, 'TRY')}
            />
          ) : null}
          {eta ? <Fact icon="timer" label="Hazırlık" value={eta} /> : null}
          {facts.phone ? (
            <Fact
              icon="call"
              label="Telefon"
              value={facts.phoneLabel}
              href={`tel:${facts.phone}`}
            />
          ) : null}
        </dl>
      </div>
    </section>
  );
}
