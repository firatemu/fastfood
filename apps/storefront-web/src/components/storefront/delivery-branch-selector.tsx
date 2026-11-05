'use client';

import { MaterialIcon } from './material-icon';

export interface ServiceableBranch {
  branchId: string;
  branchName: string;
  branchAddressLine?: string;
  serviceAreaId?: string;
  priority?: number;
  distanceKm?: number;
}

export function DeliveryBranchSelector({
  branches,
  selectedBranchId,
  onSelectBranch,
  currentBranchName,
}: {
  branches?: ServiceableBranch[];
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
  currentBranchName?: string;
}) {
  if (!branches || branches.length === 0) {
    if (!currentBranchName) return null;
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.08] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <MaterialIcon name="storefront" className="text-xl" />
        </div>
        <div className="min-w-0">
          <p className="font-anton uppercase tracking-wider text-neutral-400 text-[10px]">
            Yetkili Teslimat Şubesi
          </p>
          <p className="text-white font-anton text-sm tracking-wide truncate">{currentBranchName}</p>
        </div>
      </div>
    );
  }

  // Sadece tek şube varsa otomatik yönlendirme bilgisini göster
  if (branches.length === 1) {
    const single = branches[0];
    if (!single) return null;
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.08] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <MaterialIcon name="storefront" className="text-xl" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-anton uppercase tracking-wider text-neutral-400 text-[10px]">
              Teslimat Şubesi (Otomatik Yönlendirildi)
            </span>
          </div>
          <p className="text-white font-anton text-sm tracking-wide truncate">{single.branchName}</p>
          {single.branchAddressLine ? (
            <p className="text-neutral-400 text-xs truncate mt-0.5">{single.branchAddressLine}</p>
          ) : null}
        </div>
      </div>
    );
  }

  // Birden fazla şube varsa kullanıcının seçmesine izin ver
  return (
    <div className="mt-3 p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.08]">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <MaterialIcon name="storefront" className="text-base" />
        </div>
        <span className="font-anton uppercase tracking-wider text-xs text-white">
          Siparişin Hazırlanacağı Şube
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {branches.map((b) => {
          const isSelected = b.branchId === selectedBranchId;
          return (
            <button
              key={b.branchId}
              type="button"
              onClick={() => onSelectBranch(b.branchId)}
              className={`text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-400 text-white shadow-[0_0_15px_rgba(254,179,0,0.15)]'
                  : 'bg-[#141824] border-white/[0.06] text-neutral-300 hover:border-white/[0.15]'
              }`}
            >
              <div className="min-w-0">
                <p className="font-anton text-sm uppercase tracking-wide truncate">{b.branchName}</p>
                {b.branchAddressLine ? (
                  <p className="text-neutral-400 text-xs truncate mt-0.5">{b.branchAddressLine}</p>
                ) : null}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {b.distanceKm !== undefined ? (
                  <span className="text-[11px] font-anton text-amber-400">
                    {b.distanceKm.toFixed(1)} km
                  </span>
                ) : null}
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-amber-400 bg-amber-400' : 'border-neutral-500'
                  }`}
                >
                  {isSelected ? <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" /> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
