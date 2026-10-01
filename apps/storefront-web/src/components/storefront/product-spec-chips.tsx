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
    allergens && allergens.length > 0 ? `Alerjen: ${allergens.map((item) => item.name).join(', ')}` : null;
  if (kcal == null && proteinGrams == null && !allergenLabel) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-space-xs">
      {kcal != null ? (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
          <MaterialIcon name="local_fire_department" className="text-primary text-sm" />
          <span>{kcal} kcal</span>
        </div>
      ) : null}
      {proteinGrams != null ? (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
          <MaterialIcon name="fitness_center" className="text-secondary-container text-sm" />
          <span>{proteinGrams}g Protein</span>
        </div>
      ) : null}
      {allergenLabel ? (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
          <MaterialIcon name="info" className="text-outline text-sm" />
          <span>{allergenLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
