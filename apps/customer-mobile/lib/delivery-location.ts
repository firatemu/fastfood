export type DeliveryLocation = {
  label: string;
  latitude: number;
  longitude: number;
  serviceable: boolean;
  branchId?: string;
  serviceAreaId?: string;
};

/** Downtown Istanbul — same known-serviceable seed as Storefront. */
export const DEFAULT_DELIVERY_LOCATION: DeliveryLocation = {
  label: 'Kadıköy · Teslimat',
  latitude: 41.036,
  longitude: 28.985,
  serviceable: true,
};

let stored: DeliveryLocation = { ...DEFAULT_DELIVERY_LOCATION };

export function getDeliveryLocation(): DeliveryLocation {
  return stored;
}

export function setDeliveryLocation(next: DeliveryLocation): void {
  stored = next;
}
