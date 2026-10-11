/** Read-only QR menu projection of the catalog. Server-built, client-rendered. */

export interface QrMenuVariant {
  id: string;
  name: string;
  priceMinor: string;
}

export interface QrMenuModifier {
  id: string;
  name: string;
  priceDeltaMinor: string;
}

export interface QrMenuModifierGroup {
  id: string;
  name: string;
  selectionMin: number;
  selectionMax: number;
  modifiers: QrMenuModifier[];
}

export interface QrMenuRemovalOption {
  id: string;
  name: string;
}

export interface QrMenuProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  imageAlt: string | null;
  currency: string;
  basePriceMinor: string;
  variants: QrMenuVariant[];
  modifierGroups: QrMenuModifierGroup[];
  removalOptions: QrMenuRemovalOption[];
  /** Cheapest purchasable price (variant-aware), minor units. */
  priceMinMinor: string;
  /** Most expensive purchasable price (variant-aware), minor units. */
  priceMaxMinor: string;
}

export interface QrMenuCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

export interface QrMenuBranch {
  name: string;
  addressLine: string;
  phone: string;
  isAcceptingOrders: boolean;
}

export interface QrMenuData {
  branch: QrMenuBranch;
  categories: QrMenuCategory[];
  products: QrMenuProduct[];
  /** ISO timestamp of the server-side catalog load. */
  loadedAt: string;
}