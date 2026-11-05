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
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400/30 flex items-center justify-between gap-space-sm transition-all">
          <div className="flex items-center gap-3 min-w-0">
            {primary.imageUrl ? (
              <img
                src={primary.imageUrl}
                alt={primary.imageAlt ?? primary.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
              />
            ) : (
              <MaterialIcon name="lunch_dining" className="text-amber-400 text-2xl" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-white font-semibold uppercase truncate">
                {primary.name} ister misin?
              </span>
              {primary.description ? (
                <span className="font-body-sm text-xs text-neutral-400 line-clamp-1">
                  {primary.description}
                </span>
              ) : null}
            </div>
          </div>
          {onAdd ? (
            <button
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/30 hover:bg-amber-400 hover:text-neutral-950 text-amber-400 font-anton text-xs tracking-wider uppercase transition-all shrink-0 disabled:opacity-40 cursor-pointer"
              type="button"
              disabled={busyId === primary.id}
              onClick={() => onAdd(primary.id)}
            >
              +{formatTryMinor(primary.basePriceMinor, primary.currency)} Ekle
            </button>
          ) : (
            <Link
              href={`/products/${primary.id}`}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-amber-400 font-anton text-xs tracking-wider uppercase transition-colors shrink-0"
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
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400/30 hover:bg-white/[0.07] transition-all"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt ?? item.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-white font-semibold uppercase truncate">
                  {item.name}
                </span>
                <span className="font-anton text-sm text-amber-400">
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
