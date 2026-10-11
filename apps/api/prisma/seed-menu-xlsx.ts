/**
 * Menu import — Burger_Home_Menu.xlsx is the source of truth.
 *
 * The workbook is converted to `seed-data/menu-xlsx.json` (see
 * `scripts/regenerate-menu-json.py`) and applied here, so the catalogue is
 * never hand-maintained in two places.
 *
 * Modelling decisions (documented because the workbook is ambiguous):
 *  - "130 GR. / 100 GR." in the price column are **purchase sizes** and become
 *    ProductVariants. The cheapest size is the product's base price.
 *  - "100 gr Dana Eti (+119.95)" / "260gr Dana eti (+126.95)" are **extra
 *    patties** (İlave Köfte group), selectable *in addition to* a size variant.
 *  - Duplicate extras in the workbook ("Coleslaw salata" / "Coleslaw salatası",
 *    "Crispy sos" / "Crispy sos burger içi", "Yumurta (burger içinde/ine)") are
 *    collapsed to a single modifier each.
 *  - Product media is intentionally NOT touched: the workbook ships no photos
 *    and admins upload them through the media endpoints.
 *
 * Document 08 (catalog/customization), 35 (Prisma conventions), 37 (pricing).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { PrismaClient } from './generated/client/client.js';

type PriceRow = { label: string; priceMinor: number };
type Option = { name: string; priceMinor: number };

type MenuProduct = {
  excelName: string;
  name: string;
  slug: string;
  categorySlug: string;
  displayOrder: number;
  description: string | null;
  prices: PriceRow[];
  modifierGroups: Record<string, Option[]>;
};

type GroupSpec = {
  selectionMin: number;
  selectionMax: number;
  required?: Option[];
};

type MenuFile = {
  groups: Record<string, GroupSpec>;
  categories: Array<{ slug: string; name: string; displayOrder: number }>;
  products: MenuProduct[];
};

const MENU_JSON = fileURLToPath(new URL('./seed-data/menu-xlsx.json', import.meta.url));

function loadMenu(): MenuFile {
  return JSON.parse(readFileSync(MENU_JSON, 'utf8')) as MenuFile;
}

/** Deterministic, human-readable SKU; ≤64 chars to satisfy the column. */
function variantSku(slug: string, label: string, index: number): string {
  const base = `${slug}-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (index === 0 ? slug : base).slice(0, 64);
}

export async function seedMenuFromXlsx(prisma: PrismaClient): Promise<void> {
  const menu = loadMenu();

  // ── categories ────────────────────────────────────────────────────────────
  const categoryIdBySlug = new Map<string, string>();
  for (const c of menu.categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, displayOrder: c.displayOrder, isActive: true },
      update: { name: c.name, displayOrder: c.displayOrder, isActive: true },
      select: { id: true },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }

  // ── modifier groups + options ─────────────────────────────────────────────
  // Group names are the natural key (the model has no unique constraint).
  const groupIdByName = new Map<string, string>();
  const wantedGroups = Object.keys(menu.groups).sort();

  for (const existing of await prisma.modifierGroup.findMany({
    where: { name: { in: wantedGroups } },
    select: { id: true, name: true },
  })) {
    groupIdByName.set(existing.name, existing.id);
  }

  for (const name of wantedGroups) {
    const spec = menu.groups[name];
    let id = groupIdByName.get(name);
    if (!id) {
      const created = await prisma.modifierGroup.create({
        data: {
          name,
          selectionMin: spec.selectionMin,
          selectionMax: spec.selectionMax,
          isActive: true,
        },
        select: { id: true },
      });
      id = created.id;
      groupIdByName.set(name, id);
    } else {
      await prisma.modifierGroup.update({
        where: { id },
        data: {
          selectionMin: spec.selectionMin,
          selectionMax: spec.selectionMax,
          isActive: true,
        },
      });
    }

    // Options are rebuilt wholesale: the workbook is the only source of truth.
    await prisma.modifier.deleteMany({ where: { modifierGroupId: id } });
    const options = [...(spec.required ?? [])];
    for (const product of menu.products) {
      for (const opt of product.modifierGroups[name] ?? []) {
        if (!options.some((o) => o.name === opt.name)) options.push(opt);
      }
    }
    if (options.length > 0) {
      await prisma.modifier.createMany({
        data: options.map((o) => ({
          modifierGroupId: id as string,
          name: o.name,
          priceDeltaMinor: BigInt(o.priceMinor),
          isActive: true,
        })),
      });
    }
  }

  // ── products, variants, and group links ───────────────────────────────────
  for (const p of menu.products) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category "${p.categorySlug}" for ${p.slug}`);

    const base = p.prices[0];
    if (!base) throw new Error(`Product ${p.slug} has no price in the workbook`);

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        basePriceMinor: BigInt(base.priceMinor),
        categoryId,
        displayOrder: p.displayOrder,
        isActive: true,
      },
      update: {
        name: p.name,
        description: p.description,
        basePriceMinor: BigInt(base.priceMinor),
        categoryId,
        displayOrder: p.displayOrder,
        isActive: true,
      },
      select: { id: true },
    });

    // Variants are size choices only. The base size IS the product price, so
    // every price in the workbook becomes a selectable variant.
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    if (p.prices.length > 1) {
      await prisma.productVariant.createMany({
        data: p.prices.map((row, i) => ({
          productId: product.id,
          sku: variantSku(p.slug, row.label, i),
          name: row.label,
          priceMinor: BigInt(row.priceMinor),
          displayOrder: i,
          isActive: true,
        })),
      });
    }

    // Rebuild this product's group links (Patates Boyutu is always required,
    // everything else is optional add-ons).
    await prisma.productModifierGroup.deleteMany({ where: { productId: product.id } });
    const links = Object.keys(p.modifierGroups)
      .map((name, i) => ({ name, groupId: groupIdByName.get(name), order: i }))
      .filter((l): l is { name: string; groupId: string; order: number } => Boolean(l.groupId))
      .sort((a, b) => a.order - b.order);
    if (links.length > 0) {
      await prisma.productModifierGroup.createMany({
        data: links.map((l) => ({
          productId: product.id,
          modifierGroupId: l.groupId,
          displayOrder: l.order,
        })),
      });
    }
  }

  // ── drop groups the workbook no longer defines ────────────────────────────
  // (Et Gramajı / Tavuk Porsiyonu: superseded by ProductVariants.)
  const obsolete = await prisma.modifierGroup.findMany({
    where: { name: { notIn: wantedGroups } },
    select: { id: true, name: true, _count: { select: { productGroups: true } } },
  });
  for (const g of obsolete) {
    if (g._count.productGroups > 0) continue; // still attached elsewhere — leave it
    await prisma.modifierGroup.delete({ where: { id: g.id } });
  }

  console.log(
    `seed: menu from Excel — ${menu.categories.length} categories, ${menu.products.length} products, ` +
      `${wantedGroups.length} modifier groups`,
  );
}