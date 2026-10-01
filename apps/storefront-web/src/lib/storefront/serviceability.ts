import { createStorefrontClient } from '../api';
import { type DeliveryLocation, setDeliveryLocation } from '../delivery-location';
import { serviceabilityResponseSchema } from '../schemas';

export async function checkDeliveryServiceability(
  latitude: number,
  longitude: number,
  label: string,
): Promise<DeliveryLocation> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/serviceability',
    query: { latitude: String(latitude), longitude: String(longitude) },
    schema: serviceabilityResponseSchema,
  });
  const next: DeliveryLocation = {
    label,
    latitude,
    longitude,
    serviceable: res.data.serviceable,
    branchId: res.data.branchId ?? undefined,
    serviceAreaId: res.data.serviceAreaId ?? undefined,
  };
  setDeliveryLocation(next);
  return next;
}
