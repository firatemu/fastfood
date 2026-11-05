import { MaterialIcon } from './material-icon';

export function ProductSpecChips({
  kcal,
  proteinGrams,
  allergens,
}: {
  kcal?: number | null;
  proteinGrams?: number | null;
  allergens?: ReadonlyArray<{ id: string; name: string }>;
}) {
  const allergenLabel =
    allergens && allergens.length > 0
      ? `Alerjen: ${allergens.map((item) => item.name).join(', ')}`
      : null;
  if (kcal == null && proteinGrams == null && !allergenLabel) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {kcal != null ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-200 font-label-sm text-xs backdrop-blur-md">
          <MaterialIcon name="local_fire_department" className="text-amber-400 text-sm" />
          <span>{kcal} kcal</span>
        </div>
      ) : null}
      {proteinGrams != null ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-200 font-label-sm text-xs backdrop-blur-md">
          <MaterialIcon name="fitness_center" className="text-amber-400 text-sm" />
          <span>{proteinGrams}g Dana Protein</span>
        </div>
      ) : null}
      {allergenLabel ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-400 font-label-sm text-xs backdrop-blur-md">
          <MaterialIcon name="info" className="text-neutral-400 text-sm" />
          <span>{allergenLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
