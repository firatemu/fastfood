import type { CartLine } from './schemas';

export function cartLineTitle(line: CartLine): string {
  const name = line.productName?.trim();
  return name && name.length > 0 ? name : 'Ürün';
}

export function cartLineChips(line: CartLine): { label: string; priced: boolean }[] {
  const chips: { label: string; priced: boolean }[] = [];
  if (line.variantName) chips.push({ label: line.variantName, priced: false });
  for (const mod of line.modifiers) {
    chips.push({
      label: mod.name?.trim() || 'Ekstra',
      priced: BigInt(mod.priceDeltaMinorSnapshot) > 0n,
    });
  }
  for (const rem of line.removals) {
    chips.push({ label: rem.name?.trim() || 'Çıkarıldı', priced: false });
  }
  return chips;
}

export function cartLineUnitMinor(line: CartLine): string {
  const delta = line.modifiers.reduce((acc, mod) => acc + BigInt(mod.priceDeltaMinorSnapshot), 0n);
  return (BigInt(line.unitPriceMinorSnapshot) + delta).toString();
}
