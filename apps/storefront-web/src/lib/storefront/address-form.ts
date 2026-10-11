/**
 * Composer form helpers for the address book.
 *
 * The web composer is shared by the create and edit flows, so the blank form
 * and the saved-address mapping live next to the write-body types they feed.
 */

export type ComposerOption = {
  id: number;
  name: string;
  centerLatitude?: number;
  centerLongitude?: number;
};

export type ComposerForm = {
  label: string;
  provinceId: string;
  districtId: string;
  neighborhoodId: string;
  avenue: string;
  street: string;
  buildingNumber: string;
  floor: string;
  apartmentNumber: string;
  deliveryNote: string;
  isDefault: boolean;
};

export type EditableAddress = {
  label?: string | null;
  provinceId?: number | null;
  districtId?: number | null;
  neighborhoodId?: number | null;
  avenue?: string | null;
  street?: string | null;
  buildingNumber?: string | null;
  floor?: string | null;
  apartmentNumber?: string | null;
  deliveryNote?: string | null;
  isDefault?: boolean | null;
};

export function emptyComposerForm(): ComposerForm {
  return {
    label: '',
    provinceId: '',
    districtId: '',
    neighborhoodId: '',
    avenue: '',
    street: '',
    buildingNumber: '',
    floor: '',
    apartmentNumber: '',
    deliveryNote: '',
    isDefault: true,
  };
}

function text(value: string | null | undefined): string {
  return value ?? '';
}

function optionId(value: number | null | undefined): string {
  return typeof value === 'number' && value > 0 ? String(value) : '';
}

/** Fills the composer with a saved address so an edit starts from stored values. */
export function composerFormFromAddress(address: EditableAddress): ComposerForm {
  return {
    label: text(address.label),
    provinceId: optionId(address.provinceId),
    districtId: optionId(address.districtId),
    neighborhoodId: optionId(address.neighborhoodId),
    avenue: text(address.avenue),
    street: text(address.street),
    buildingNumber: text(address.buildingNumber),
    floor: text(address.floor),
    apartmentNumber: text(address.apartmentNumber),
    deliveryNote: text(address.deliveryNote),
    isDefault: address.isDefault === true,
  };
}
