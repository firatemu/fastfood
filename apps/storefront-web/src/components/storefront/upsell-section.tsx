'use client';

import Link from 'next/link';

import { formatTryMinor } from '../../lib/money';
import type { StorefrontProductDetail } from '../../lib/storefront/catalog';

import { MaterialIcon } from './material-icon';

export function UpsellSection({
  items,
  onAdd,
  busyId,
}: {
  items: StorefrontProductDetail['recommendations'];
  onAdd?: (productId: string) => void;
  busyId?: string | null;
}) {
  if (items.length === 0) return null;
  const primary = items[0];
  const rest = items.slice(1);

  return (
    <div className="flex flex-col gap-space-sm">
      {primary ? (
        <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-3 min-w-0">
            {primary.imageUrl ? (
              <img
                src={primary.imageUrl}
                alt={primary.imageAlt ?? primary.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <MaterialIcon name="lunch_dining" className="text-secondary text-2xl" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface uppercase truncate">
                {primary.name} ister misin?
              </span>
              {primary.description ? (
                <span className="font-body-sm text-xs text-on-surface-variant line-clamp-1">
                  {primary.description}
                </span>
              ) : null}
            </div>
          </div>
          {onAdd ? (
            <button
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm uppercase transition-colors shrink-0 disabled:opacity-40"
              type="button"
              disabled={busyId === primary.id}
              onClick={() => onAdd(primary.id)}
            >
              +{formatTryMinor(primary.basePriceMinor, primary.currency)} Ekle
            </button>
          ) : (
            <Link
              href={`/products/${primary.id}`}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm uppercase transition-colors shrink-0"
            >
              İncele
            </Link>
          )}
        </div>
      ) : null}
      {rest.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          {rest.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.id}`}
              className="flex items-center gap-3 p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt ?? item.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-surface-container shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface uppercase truncate">{item.name}</span>
                <span className="font-label-md text-label-md text-secondary-container">
                  {formatTryMinor(item.basePriceMinor, item.currency)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
