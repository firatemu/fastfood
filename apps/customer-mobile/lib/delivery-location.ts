export type DeliveryLocation = {
  label: string;
  latitude: number;
  longitude: number;
  serviceable: boolean;
  branchId?: string;
  serviceAreaId?: string;
};

/** Downtown Adana — same known-serviceable seed as Storefront. */
export const DEFAULT_DELIVERY_LOCATION: DeliveryLocation = {
  label: 'Seyhan · Teslimat',
  latitude: 37.0,
  longitude: 35.3213,
  serviceable: true,
};

let stored: DeliveryLocation = { ...DEFAULT_DELIVERY_LOCATION };

export function getDeliveryLocation(): DeliveryLocation {
  return stored;
}

export function setDeliveryLocation(next: DeliveryLocation): void {
  stored = next;
}
