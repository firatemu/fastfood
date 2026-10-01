import type { z } from 'zod';

import type { categorySchema, productSchema } from './schemas';

type Product = z.infer<typeof productSchema>;
type Category = z.infer<typeof categorySchema>;

const DEV_LABEL = /human\s*test|^\s*persist\b|sandbox|qa\b|fixture/i;

export function isVitrineName(name: string, slug: string): boolean {
  return !DEV_LABEL.test(name) && !DEV_LABEL.test(slug);
}

export function vitrineProducts(products: Product[]): Product[] {
  const curated = products.filter((p) => p.isActive && isVitrineName(p.name, p.slug));
  if (curated.length > 0) return curated.sort((a, b) => a.displayOrder - b.displayOrder);
  return [...products].filter((p) => p.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function vitrineCategories(categories: Category[]): Category[] {
  const curated = categories.filter((c) => c.isActive && isVitrineName(c.name, c.slug));
  if (curated.length > 0) return curated.sort((a, b) => a.displayOrder - b.displayOrder);
  return [...categories].filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Hero: prefer flagship burgers, not arbitrary catalog order. */
export function pickHeroProduct(products: Product[]): Product | undefined {
  const pool = vitrineProducts(products);
  const preferred = pool.find((p) => /cheese|classic|smash|bbq|signature/i.test(p.slug));
  if (preferred) return preferred;
  const priced = pool.filter((p) => BigInt(p.basePriceMinor) >= 5000n);
  return priced[0] ?? pool[0];
}

export function formatBranchEta(min: number, max: number, accepting: boolean): string | undefined {
  if (!accepting) return undefined;
  if (min <= 0 && max <= 0) return undefined;
  if (min > 0 && max > 0) return `${min}–${max} dk`;
  return `${max > 0 ? max : min} dk`;
}
