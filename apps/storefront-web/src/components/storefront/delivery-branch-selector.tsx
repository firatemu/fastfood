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
      <div className="mt-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
        <MaterialIcon name="storefront" className="text-primary-container text-xl shrink-0" />
        <div className="min-w-0">
          <p className="font-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">
            Yetkili Teslimat Şubesi
          </p>
          <p className="font-body-md text-on-surface font-semibold truncate">{currentBranchName}</p>
        </div>
      </div>
    );
  }

  // Sadece tek şube varsa otomatik yönlendirme bilgisini göster
  if (branches.length === 1) {
    const single = branches[0]!;
    return (
      <div className="mt-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
        <MaterialIcon name="storefront" className="text-primary-container text-xl shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">
              Teslimat Şubesi (Otomatik Yönlendirildi)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary-container font-label-sm text-[10px] uppercase font-bold">
              {single.distanceKm != null
                ? `${single.distanceKm} km · Azami 10.0 km Kapsamında`
                : 'Azami 10.0 km Kapsamında'}
            </span>
          </div>
          <p className="font-body-md text-on-surface font-semibold truncate">{single.branchName}</p>
          {single.branchAddressLine ? (
            <p className="font-body-xs text-on-surface-variant text-xs truncate mt-0.5">
              {single.branchAddressLine}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Birden fazla şube kesişiminde yer alıyorsa müşteriye seçim sun
  return (
    <div className="mt-4 p-4 rounded-xl bg-surface-container-low border border-primary-container/30 flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-lg bg-primary-container/10 text-primary-container shrink-0 mt-0.5">
          <MaterialIcon name="alt_route" className="text-xl" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-label-lg uppercase tracking-wider text-on-surface font-bold text-sm">
              Teslimat Şubesini Seçin
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-container font-label-sm text-[10px] font-bold uppercase">
              Kesişim Bölgesi
            </span>
          </div>
          <p className="font-body-sm text-on-surface-variant text-xs mt-1">
            Adresiniz <strong>{branches.length} şubemizin</strong> azami 10.0 km servis mesafesi kesişiminde bulunuyor.
            Siparişinizi hazırlamasını istediğiniz şubeyi seçebilirsiniz:
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
        {branches.map((b) => {
          const isSelected = selectedBranchId ? b.branchId === selectedBranchId : b.priority === 0;
          return (
            <button
              key={b.branchId}
              type="button"
              onClick={() => onSelectBranch(b.branchId)}
              className={`p-3 rounded-lg text-left transition-all border flex flex-col gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-surface-container-high border-primary-container shadow-[0_0_0_1.5px_#feb300]'
                  : 'bg-surface-container border-outline-variant/30 hover:border-outline-variant'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-label-md text-on-surface font-semibold text-sm">
                  {b.branchName}
                </span>
                <div className="flex items-center gap-2">
                  {b.distanceKm != null ? (
                    <span className="text-[11px] font-semibold text-secondary-container bg-secondary-container/10 px-1.5 py-0.5 rounded">
                      {b.distanceKm} km
                    </span>
                  ) : null}
                  <input
                    type="radio"
                    name="deliveryBranchSelect"
                    checked={isSelected}
                    onChange={() => onSelectBranch(b.branchId)}
                    className="accent-primary-container"
                  />
                </div>
              </div>
              {b.branchAddressLine ? (
                <span className="font-body-xs text-on-surface-variant text-xs line-clamp-1">
                  {b.branchAddressLine}
                </span>
              ) : null}
              <span className="font-label-sm text-[10px] text-primary-container font-medium mt-1">
                {isSelected ? '✓ Seçili Şube' : 'Bu şubeden sipariş ver'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
