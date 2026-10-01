export interface DeliveryLocation {
  label: string;
  latitude: number;
  longitude: number;
  branchId?: string;
  serviceAreaId?: string;
  serviceable: boolean;
}

const KEY = 'ff_delivery_location';

/** Downtown Istanbul — known serviceable seed coordinates. */
export const DEFAULT_DELIVERY_LOCATION: DeliveryLocation = {
  label: 'Kadıköy · Teslimat',
  latitude: 41.036,
  longitude: 28.985,
  serviceable: true,
};

export function getDeliveryLocation(): DeliveryLocation {
  if (typeof window === 'undefined') return DEFAULT_DELIVERY_LOCATION;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_DELIVERY_LOCATION;
    const parsed = JSON.parse(raw) as DeliveryLocation;
    if (
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.label === 'string'
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DELIVERY_LOCATION;
}

export function setDeliveryLocation(location: DeliveryLocation): void {
  window.localStorage.setItem(KEY, JSON.stringify(location));
  window.dispatchEvent(new CustomEvent('ff-delivery-location'));
}

export function subscribeDeliveryLocation(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener('ff-delivery-location', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('ff-delivery-location', handler);
    window.removeEventListener('storage', handler);
  };
}
