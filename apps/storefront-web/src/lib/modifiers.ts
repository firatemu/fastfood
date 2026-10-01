import type { z } from 'zod';

import type { storefrontModifierGroupSchema } from './schemas';

export type ModifierGroup = z.infer<typeof storefrontModifierGroupSchema>;

export function defaultModifierSelection(groups: ModifierGroup[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const group of groups) {
    if (group.selectionMin > 0 && group.modifiers[0]) {
      out[group.id] = [group.modifiers[0].id];
    }
  }
  return out;
}

export function toggleModifierSelection(
  groups: ModifierGroup[],
  current: Record<string, string[]>,
  groupId: string,
  modifierId: string,
): Record<string, string[]> {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return current;
  const prev = current[groupId] ?? [];
  const has = prev.includes(modifierId);
  let next: string[];
  if (has) {
    next = prev.filter((id) => id !== modifierId);
  } else if (group.selectionMax === 1) {
    next = [modifierId];
  } else if (prev.length >= group.selectionMax) {
    next = prev;
  } else {
    next = [...prev, modifierId];
  }
  return { ...current, [groupId]: next };
}

export function computeUnitPriceMinor(
  basePriceMinor: string,
  groups: ModifierGroup[],
  selectedByGroup: Record<string, string[]>,
): string {
  let sum = BigInt(basePriceMinor);
  for (const group of groups) {
    const ids = selectedByGroup[group.id] ?? [];
    for (const mod of group.modifiers) {
      if (ids.includes(mod.id)) sum += BigInt(mod.priceDeltaMinor);
    }
  }
  return sum.toString();
}

export function selectedModifiersPayload(
  groups: ModifierGroup[],
  selectedByGroup: Record<string, string[]>,
): { modifierId: string; priceDeltaMinorSnapshot: string }[] {
  return groups.flatMap((group) => {
    const ids = selectedByGroup[group.id] ?? [];
    return group.modifiers
      .filter((mod) => ids.includes(mod.id))
      .map((mod) => ({ modifierId: mod.id, priceDeltaMinorSnapshot: mod.priceDeltaMinor }));
  });
}

export function isRequiredGroup(group: ModifierGroup): boolean {
  return group.selectionMin > 0;
}

export function isRadioGroup(group: ModifierGroup): boolean {
  return group.selectionMax === 1 && group.selectionMin >= 1;
}

export function variantBasePriceMinor(
  basePriceMinor: string,
  variants: ReadonlyArray<{ id: string; priceMinor: string }>,
  variantId: string | null,
): string {
  if (!variantId) return basePriceMinor;
  return variants.find((item) => item.id === variantId)?.priceMinor ?? basePriceMinor;
}

export function incompleteRequiredGroupNames(
  groups: ModifierGroup[],
  selectedByGroup: Record<string, string[]>,
  variants: ReadonlyArray<{ id: string }>,
  variantId: string | null,
): string[] {
  const names: string[] = [];
  if (variants.length > 1 && !variantId) names.push('Boy / varyant');
  for (const group of groups) {
    const count = selectedByGroup[group.id]?.length ?? 0;
    if (count < group.selectionMin) names.push(group.name);
  }
  return names;
}

export function requiredSelectionsMet(
  groups: ModifierGroup[],
  selectedByGroup: Record<string, string[]>,
  variants: ReadonlyArray<{ id: string }>,
  variantId: string | null,
): boolean {
  if (variants.length > 1 && !variantId) return false;
  for (const group of groups) {
    const count = selectedByGroup[group.id]?.length ?? 0;
    if (count < group.selectionMin || count > group.selectionMax) return false;
  }
  return true;
}

export function configuredPreviewUnitMinor(
  basePriceMinor: string,
  variants: ReadonlyArray<{ id: string; priceMinor: string }>,
  variantId: string | null,
  groups: ModifierGroup[],
  selectedByGroup: Record<string, string[]>,
): string {
  return computeUnitPriceMinor(
    variantBasePriceMinor(basePriceMinor, variants, variantId),
    groups,
    selectedByGroup,
  );
}

export function selectedConfigurationLabels(
  groups: ModifierGroup[],
  selectedByGroup: Record<string, string[]>,
  variantName: string | null,
  removalNames: string[],
): { label: string; priced: boolean }[] {
  const chips: { label: string; priced: boolean }[] = [];
  if (variantName) chips.push({ label: variantName, priced: false });
  for (const group of groups) {
    const ids = selectedByGroup[group.id] ?? [];
    for (const mod of group.modifiers) {
      if (!ids.includes(mod.id)) continue;
      chips.push({ label: mod.name, priced: BigInt(mod.priceDeltaMinor) > 0n });
    }
  }
  for (const name of removalNames) {
    chips.push({ label: name, priced: false });
  }
  return chips;
}
