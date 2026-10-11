import { resolvePriceBounds } from './format';
import type {
  QrMenuCategory,
  QrMenuData,
  QrMenuModifierGroup,
  QrMenuProduct,
  QrMenuRemovalOption,
  QrMenuVariant,
} from './types';

/**
 * Server-only catalog loader for the QR menu.
 *
 * The QR menu runs on its own origin, and the API's CORS allowlist does not
 * include it. Everything is therefore fetched server-side during render and
 * handed to the client as plain data; `<img>` requests for product media are
 * not CORS-constrained, so images still load from the API origin.
 */

const API_BASE_URL = (process.env.QR_MENU_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/+$/,
  '',
);

const configuredRevalidate = Number(process.env.QR_MENU_REVALIDATE_SECONDS ?? 60);
const REVALIDATE_SECONDS = Number.isFinite(configuredRevalidate) ? configuredRevalidate : 60;

interface Envelope<T> {
  data: T;
}

interface RawHomeProduct {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  basePriceMinor: string;
  currency: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

interface RawHomeCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

interface RawHomeBranch {
  name: string;
  addressLine: string | null;
  phone: string | null;
  isAcceptingOrders: boolean;
}

interface RawHome {
  branch: RawHomeBranch;
  categories: RawHomeCategory[];
  products: RawHomeProduct[];
}

interface RawVariant {
  id: string;
  name: string;
  priceMinor: string;
  displayOrder: number;
}

interface RawModifier {
  id: string;
  name: string;
  priceDeltaMinor: string;
}

interface RawModifierGroup {
  id: string;
  name: string;
  selectionMin: number;
  selectionMax: number;
  modifiers: RawModifier[];
}

interface RawProductDetail {
  media: { id: string; url: string; altText: string | null; displayOrder: number }[];
  modifierGroups: RawModifierGroup[];
  variants: RawVariant[];
  removalOptions: { id: string; name: string }[];
  categoryName: string | null;
  categorySlug: string | null;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`QR menu catalog request failed: ${path} → ${response.status}`);
  }
  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
}

function toVariant(raw: RawVariant): QrMenuVariant {
  return { id: raw.id, name: raw.name, priceMinor: raw.priceMinor };
}

function toModifierGroup(raw: RawModifierGroup): QrMenuModifierGroup {
  return {
    id: raw.id,
    name: raw.name,
    selectionMin: raw.selectionMin,
    selectionMax: raw.selectionMax,
    modifiers: raw.modifiers.map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      priceDeltaMinor: modifier.priceDeltaMinor,
    })),
  };
}

function toRemovalOption(raw: { id: string; name: string }): QrMenuRemovalOption {
  return { id: raw.id, name: raw.name };
}

/**
 * Build one QR menu product from the home payload plus (optionally) its detail
 * payload. A failed detail request degrades to the summary record instead of
 * failing the whole menu render.
 */
function toQrMenuProduct(
  home: RawHomeProduct,
  detail: RawProductDetail | undefined,
  categoryName: string,
): QrMenuProduct {
  const variants = [...(detail?.variants ?? [])]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(toVariant);

  const primaryMedia = [...(detail?.media ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)[0];

  const bounds = resolvePriceBounds(
    home.basePriceMinor,
    variants.map((variant) => variant.priceMinor),
  );

  return {
    id: home.id,
    slug: home.slug,
    name: home.name,
    description: home.description,
    categoryId: home.categoryId,
    categoryName: detail?.categoryName ?? categoryName,
    imageUrl: primaryMedia?.url ?? home.imageUrl,
    imageAlt: primaryMedia?.altText ?? home.imageAlt ?? home.name,
    currency: home.currency,
    basePriceMinor: home.basePriceMinor,
    variants,
    modifierGroups: (detail?.modifierGroups ?? []).map(toModifierGroup),
    removalOptions: (detail?.removalOptions ?? []).map(toRemovalOption),
    priceMinMinor: bounds.min,
    priceMaxMinor: bounds.max,
  };
}

/** Load the full read-only menu: categories plus every product with its options. */
export async function getQrMenuData(): Promise<QrMenuData> {
  const home = await apiGet<RawHome>('/storefront/home');

  const details = await Promise.allSettled(
    home.products.map((product) =>
      apiGet<RawProductDetail>(
        `/storefront/catalog/products/${encodeURIComponent(product.slug)}`,
      ),
    ),
  );

  const categoryNameById = new Map(home.categories.map((category) => [category.id, category.name]));

  const products: QrMenuProduct[] = home.products.map((homeProduct, index) => {
    const settled = details[index];
    const detail = settled?.status === 'fulfilled' ? settled.value : undefined;
    return toQrMenuProduct(homeProduct, detail, categoryNameById.get(homeProduct.categoryId) ?? '');
  });

  const categories: QrMenuCategory[] = [...home.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
    }));

  return {
    branch: {
      name: home.branch.name,
      addressLine: home.branch.addressLine ?? '',
      phone: home.branch.phone ?? '',
      isAcceptingOrders: home.branch.isAcceptingOrders,
    },
    categories,
    products,
    loadedAt: new Date().toISOString(),
  };
}