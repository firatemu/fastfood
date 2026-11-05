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
      <div className="w-full rounded-3xl bg-gradient-to-br from-[#181d2c]/95 via-[#121622]/95 to-[#0b0d14]/95 border border-amber-500/25 p-6 md:p-10 lg:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center gap-space-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(254,179,0,0.12)]">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-orange-600/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="w-full lg:w-7/12 flex flex-col gap-space-md z-10">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-400 font-label-sm text-label-sm uppercase font-bold flex items-center gap-1.5">
              <MaterialIcon name="local_fire_department" className="text-sm" />
              GÜNÜN KOMBO FIRSATI
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-neutral-300 font-label-sm text-label-sm flex items-center gap-1.5">
              <MaterialIcon name="schedule" className="text-sm text-amber-400" />
              <span className="font-mono text-amber-400 font-bold" id="combo-countdown">
                {label}
              </span>{' '}
              Kaldı
            </span>
          </div>
          <h2 className="font-anton text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white leading-tight">
            {lead} <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{rest}</span>
          </h2>
          <p className="font-body-md text-body-md text-neutral-300 max-w-lg leading-relaxed">
            {combo.description}
          </p>
          <div className="flex items-baseline gap-space-md">
            <div className="flex items-baseline gap-2">
              <span className="font-anton text-3xl md:text-4xl text-amber-400 drop-shadow-sm">
                {formatTryMinor(combo.bundlePriceMinor, combo.currency)}
              </span>
              {combo.compareAtMinor ? (
                <span className="font-anton text-xl text-neutral-500 line-through">
                  {formatTryMinor(combo.compareAtMinor, combo.currency)}
                </span>
              ) : null}
            </div>
            {combo.savingsPercent !== null ? (
              <span className="px-3 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 font-label-sm text-label-sm uppercase font-bold">
                %{combo.savingsPercent} Tasarruf
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
            <button
              className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 font-label-md text-label-md uppercase tracking-wider hover:brightness-110 shadow-[0_4px_20px_rgba(254,179,0,0.35)] transition-all flex items-center gap-2 font-bold disabled:opacity-50"
              type="button"
              onClick={onAdd}
              disabled={busy}
            >
              <MaterialIcon name="bolt" className="text-xl" />
              <span>Komboyu Sepete Ekle</span>
            </button>
            <Link
              href={combo.items[0] ? `/products/${combo.items[0].productId}` : '/menu'}
              className="px-6 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-label-md text-label-md uppercase tracking-wider font-semibold transition-all hover:border-white/20"
            >
              Komboyu Kişiselleştir
            </Link>
          </div>
        </div>
        <div className="w-full lg:w-5/12 flex justify-center z-10">
          <div className="relative w-full max-w-md h-80 rounded-2xl overflow-hidden bg-neutral-950/80 border border-amber-400/25 p-2 shadow-2xl flex items-center justify-center">
            {combo.imageUrl ? (
              <img
                className="w-full h-full object-cover rounded-xl"
                alt={combo.name}
                src={combo.imageUrl}
              />
            ) : null}
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-neutral-900/90 backdrop-blur-md border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="local_mall" className="text-amber-400 text-lg" />
                <span className="font-label-sm text-label-sm uppercase text-white font-medium">
                  Özel Kraft Kutu Teslimatı
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-amber-400 font-bold">
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
