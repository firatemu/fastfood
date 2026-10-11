import { parseTryMajorToMinor } from './catalog-ops';

/**
 * Field keys that can carry an inline validation message. `slug` is API-owned
 * (read-only in the form) and `description` is free text, so neither is validated.
 */
export type ProductFormField = 'name' | 'categoryId' | 'basePriceMajor' | 'displayOrder';

export type ProductFormValues = {
  name: string;
  categoryId: string;
  basePriceMajor: string;
  displayOrder: string;
};

export type ProductFormErrors = Partial<Record<ProductFormField, string>>;

/**
 * Tab / reading order of the form. Used to pick which field receives focus after a
 * failed save, so the operator lands on the first thing they have to fix.
 */
export const PRODUCT_FORM_FIELD_ORDER: readonly ProductFormField[] = [
  'name',
  'categoryId',
  'basePriceMajor',
  'displayOrder',
];

/**
 * Messages are self-contained: they render directly under the input, away from
 * the banner, so they name the field instead of saying "this value".
 */
export const PRODUCT_FORM_MESSAGES: Record<ProductFormField, string> = {
  name: 'Ürün adı zorunlu.',
  categoryId: 'Bir kategori seçin.',
  basePriceMajor: 'Fiyat geçersiz. Örn. 129,90',
  displayOrder: 'Sıra sıfır veya daha büyük bir tam sayı olmalı.',
};

/**
 * Pure field-level validation of the product form.
 *
 * The rules mirror the checks the save path has always applied, so turning them
 * into live field errors cannot accept anything the API would have rejected:
 * a blank name, no category, a non-integer/negative display order, and a price
 * that is present but unparseable. An empty price stays valid (optional field).
 */
export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (!values.name.trim()) {
    errors.name = PRODUCT_FORM_MESSAGES.name;
  }
  if (!values.categoryId) {
    errors.categoryId = PRODUCT_FORM_MESSAGES.categoryId;
  }
  if (!Number.isInteger(Number(values.displayOrder)) || Number(values.displayOrder) < 0) {
    errors.displayOrder = PRODUCT_FORM_MESSAGES.displayOrder;
  }
  if (
    values.basePriceMajor.trim().length > 0 &&
    parseTryMajorToMinor(values.basePriceMajor) === null
  ) {
    errors.basePriceMajor = PRODUCT_FORM_MESSAGES.basePriceMajor;
  }

  return errors;
}

/** First invalid field in reading order, or null when the form is clean. */
export function firstInvalidField(errors: ProductFormErrors): ProductFormField | null {
  for (const field of PRODUCT_FORM_FIELD_ORDER) {
    if (errors[field]) return field;
  }
  return null;
}

/**
 * Errors for the fields the operator has actually interacted with. Keeps the form
 * quiet on open (no red fields before a single keystroke) while still correcting
 * immediately once a field has been visited.
 */
export function visibleProductFormErrors(
  errors: ProductFormErrors,
  touched: ReadonlySet<ProductFormField>,
): ProductFormErrors {
  const visible: ProductFormErrors = {};
  for (const [field, message] of Object.entries(errors) as [ProductFormField, string][]) {
    if (touched.has(field)) visible[field] = message;
  }
  return visible;
}
