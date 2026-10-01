import { z } from 'zod';

export {
  courierClaimResponseSchema as claimResponseSchema,
  courierDeliveriesResponseSchema as deliveriesResponseSchema,
  courierDeliveryResponseSchema as deliveryResponseSchema,
  courierDeliverySchema as deliverySchema,
  courierLocationResponseSchema as locationResponseSchema,
  courierNavigationResponseSchema as navigationResponseSchema,
} from '@fastfood/contracts';

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    meta: z.unknown().optional(),
  });
}

export const staffLoginResponseSchema = envelope(
  z.object({
    userId: z.string(),
    refreshToken: z.string(),
    refreshExpiresAt: z.string(),
    mfaRequired: z.boolean(),
  }),
);

export const staffMfaResponseSchema = envelope(
  z.object({
    userId: z.string(),
    accessToken: z.string(),
  }),
);
