'use client';

import Link from 'next/link';
import { useState } from 'react';

import { clearDiningContext, readDiningContext } from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

export function DiningContextBanner() {
  const [label, setLabel] = useState<string | null>(null);
  useDeferredLoad(() => {
    const table = readDiningContext();
    setLabel(table ? `${table.branchName} · ${table.label}` : null);
  }, []);
  if (!label) return null;
  return (
    <>
      <div
        className="fixed top-20 left-0 right-0 z-40 bg-surface-container-low text-on-surface px-margin-sm lg:px-margin py-2 flex items-center justify-between gap-3"
        data-ff-dining-banner
      >
        <p className="font-label-sm uppercase truncate">{label}</p>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/account/table" className="font-label-sm uppercase text-secondary-container">
            Masa
          </Link>
          <button
            type="button"
            className="font-label-sm uppercase text-on-surface-variant"
            onClick={() => {
              clearDiningContext();
              setLabel(null);
            }}
          >
            Kapat
          </button>
        </div>
      </div>
      <div className="h-10" aria-hidden />
    </>
  );
}
