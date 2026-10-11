import { describe, expect, it } from 'vitest';

import {
  PRODUCT_FORM_FIELD_ORDER,
  PRODUCT_FORM_MESSAGES,
  firstInvalidField,
  validateProductForm,
  visibleProductFormErrors,
  type ProductFormValues,
} from './product-form-validation';

const valid: ProductFormValues = {
  name: '1- HOME CLASSIC BURGER',
  categoryId: 'cat-burger',
  basePriceMajor: '189,90',
  displayOrder: '1',
};

function withPatch(patch: Partial<ProductFormValues>): ProductFormValues {
  return { ...valid, ...patch };
}

describe('validateProductForm', () => {
  it('accepts a complete form', () => {
    expect(validateProductForm(valid)).toEqual({});
  });

  it('treats whitespace-only names as missing', () => {
    expect(validateProductForm(withPatch({ name: '   ' })).name).toBe(PRODUCT_FORM_MESSAGES.name);
  });

  it('requires a category', () => {
    expect(validateProductForm(withPatch({ categoryId: '' })).categoryId).toBe(
      PRODUCT_FORM_MESSAGES.categoryId,
    );
  });

  it('rejects a non-integer display order', () => {
    expect(validateProductForm(withPatch({ displayOrder: '1.5' })).displayOrder).toBe(
      PRODUCT_FORM_MESSAGES.displayOrder,
    );
  });

  it('rejects a negative display order', () => {
    expect(validateProductForm(withPatch({ displayOrder: '-3' })).displayOrder).toBe(
      PRODUCT_FORM_MESSAGES.displayOrder,
    );
  });

  it('accepts zero as a display order', () => {
    expect(validateProductForm(withPatch({ displayOrder: '0' })).displayOrder).toBeUndefined();
  });

  it('rejects a price that is present but unparseable', () => {
    expect(validateProductForm(withPatch({ basePriceMajor: '12,34,56' })).basePriceMajor).toBe(
      PRODUCT_FORM_MESSAGES.basePriceMajor,
    );
  });

  it('leaves an empty price valid', () => {
    expect(validateProductForm(withPatch({ basePriceMajor: '' })).basePriceMajor).toBeUndefined();
  });

  it('leaves a whitespace-only price valid', () => {
    expect(
      validateProductForm(withPatch({ basePriceMajor: '   ' })).basePriceMajor,
    ).toBeUndefined();
  });

  it('accepts dot-separated prices', () => {
    expect(
      validateProductForm(withPatch({ basePriceMajor: '129.90' })).basePriceMajor,
    ).toBeUndefined();
  });

  it('reports every failing field at once', () => {
    const errors = validateProductForm({
      name: '',
      categoryId: '',
      basePriceMajor: 'abc',
      displayOrder: 'x',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['basePriceMajor', 'categoryId', 'displayOrder', 'name'].sort(),
    );
  });
});

describe('firstInvalidField', () => {
  it('returns the first failing field in reading order', () => {
    const errors = validateProductForm({
      name: '',
      categoryId: '',
      basePriceMajor: '',
      displayOrder: 'x',
    });
    expect(firstInvalidField(errors)).toBe('name');
  });

  it('skips valid fields to reach the first failure', () => {
    const errors = validateProductForm(withPatch({ displayOrder: 'x' }));
    expect(firstInvalidField(errors)).toBe('displayOrder');
  });

  it('returns null for a clean form', () => {
    expect(firstInvalidField(validateProductForm(valid))).toBeNull();
  });

  it('covers every validated field in the order constant', () => {
    expect(PRODUCT_FORM_FIELD_ORDER).toEqual([
      'name',
      'categoryId',
      'basePriceMajor',
      'displayOrder',
    ]);
  });
});

describe('visibleProductFormErrors', () => {
  const errors = {
    name: PRODUCT_FORM_MESSAGES.name,
    displayOrder: PRODUCT_FORM_MESSAGES.displayOrder,
  };

  it('hides errors for fields the operator has not touched', () => {
    expect(visibleProductFormErrors(errors, new Set())).toEqual({});
  });

  it('shows only the touched field', () => {
    expect(visibleProductFormErrors(errors, new Set(['name']))).toEqual({
      name: PRODUCT_FORM_MESSAGES.name,
    });
  });

  it('shows every touched field at once', () => {
    expect(visibleProductFormErrors(errors, new Set(['name', 'displayOrder']))).toEqual(errors);
  });
});
