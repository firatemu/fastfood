'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatTryMinor } from '../../lib/money';
import type { StorefrontHome } from '../../lib/storefront/home';

import { MaterialIcon } from './material-icon';

function formatHms(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export function HomeCombo({
  combo,
  onAdd,
  busy,
}: {
  combo: NonNullable<StorefrontHome['combo']>;
  onAdd: () => void;
  busy: boolean;
}) {
  const [label, setLabel] = useState('00:00:00');

  useEffect(() => {
    if (!combo.endsAt || combo.expired) return;
    const endsAt = combo.endsAt;
    const tick = () => setLabel(formatHms(Date.parse(endsAt) - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [combo.endsAt, combo.expired]);

  if (combo.expired) {
    return (
      <section className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl">
        <div className="w-full rounded-2xl bg-surface-container-low p-space-md lg:p-space-xl text-on-surface-variant">
          Günün kombo fırsatı şu an yayında değil.
        </div>
      </section>
    );
  }

  const [lead, rest] = splitComboName(combo.name);

  return (
    <section className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl">
      <div className="w-full rounded-2xl bg-surface-container-low p-space-md lg:p-space-xl relative overflow-hidden flex flex-col lg:flex-row items-center gap-space-xl shadow-2xl">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="w-full lg:w-7/12 flex flex-col gap-space-md z-10">
          <div className="flex items-center gap-space-sm">
            <span className="px-3 py-1 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm uppercase font-bold">
              GÜNÜN KOMBO FIRSATI
            </span>
            <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
              <MaterialIcon name="schedule" className="text-sm text-secondary-container" />
              <span className="font-mono text-on-surface font-bold" id="combo-countdown">
                {label}
              </span>{' '}
              Kaldı
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase">
            {lead} <br />
            <span className="text-secondary-container">{rest}</span>
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">{combo.description}</p>
          <div className="flex items-baseline gap-space-md">
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl text-primary-container">
                {formatTryMinor(combo.bundlePriceMinor, combo.currency)}
              </span>
              {combo.compareAtMinor ? (
                <span className="font-headline-sm text-headline-sm text-on-surface-variant/60 line-through">
                  {formatTryMinor(combo.compareAtMinor, combo.currency)}
                </span>
              ) : null}
            </div>
            {combo.savingsPercent !== null ? (
              <span className="px-2.5 py-1 rounded bg-surface-container-high text-secondary font-label-sm text-label-sm uppercase font-bold">
                %{combo.savingsPercent} Tasarruf
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
            <button
              className="px-space-xl py-3.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-label-lg uppercase tracking-wide hover:brightness-110 shadow-lg transition-all flex items-center gap-2 font-bold disabled:opacity-50"
              type="button"
              onClick={onAdd}
              disabled={busy}
            >
              <MaterialIcon name="bolt" className="text-lg" />
              <span>Komboyu Sepete Ekle</span>
            </button>
            <Link
              href={combo.items[0] ? `/products/${combo.items[0].productId}` : '/menu'}
              className="px-space-md py-3.5 rounded-lg bg-surface-container-high text-on-surface font-label-lg text-label-lg uppercase hover:bg-surface-bright transition-all"
            >
              Komboyu Kişiselleştir
            </Link>
          </div>
        </div>
        <div className="w-full lg:w-5/12 flex justify-center z-10">
          <div className="relative w-full max-w-md h-80 rounded-xl overflow-hidden bg-surface-container-lowest p-2 shadow-2xl flex items-center justify-center">
            {combo.imageUrl ? (
              <img
                className="w-full h-full object-cover rounded-lg"
                alt={combo.name}
                src={combo.imageUrl}
              />
            ) : null}
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-surface/90 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="local_mall" className="text-primary-container text-lg" />
                <span className="font-label-sm text-label-sm uppercase text-on-surface">
                  Özel Kraft Kutu Teslimatı
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-primary-container font-bold">
                Ücretsiz Sos Dahil
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function splitComboName(name: string): [string, string] {
  const idx = name.indexOf(':');
  if (idx === -1) return [name, ''];
  return [name.slice(0, idx + 1), name.slice(idx + 1).trim()];
}
