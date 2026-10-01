import { z } from 'zod';

/** Address entry is intentionally limited to the provinces in the local delivery rollout. */
export const ADDRESS_ALLOWED_PROVINCE_IDS = [1, 80, 27, 33, 34] as const;

export const addressGeographyOptionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  centerLatitude: z.number().min(-90).max(90).optional(),
  centerLongitude: z.number().min(-180).max(180).optional(),
});

export const addressGeographyOptionsResponseSchema = z.object({
  data: z.array(addressGeographyOptionSchema),
  meta: z.unknown().optional(),
});

export type AddressGeographyOption = z.infer<typeof addressGeographyOptionSchema>;
