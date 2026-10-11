import { z } from 'zod';

export {
  courierClaimResponseSchema as claimResponseSchema,
  courierDeliveriesResponseSchema as deliveriesResponseSchema,
  courierDeliveryResponseSchema as deliveryResponseSchema,
  courierDeliverySchema as deliverySchema,
  courierLocationResponseSchema as locationResponseSchema,
  courierNavigationResponseSchema as navigationResponseSchema,
  courierPerformanceResponseSchema as performanceResponseSchema,
} from '@fastfood/contracts';

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    meta: z.unknown().optional(),
  });
}

/**
 * `POST /auth/staff/login`.
 *
 * `accessToken` is optional and mirrors the web courier client
 * (`apps/courier-web/src/lib/api.ts`): when the account does not require MFA the
 * API returns the access token directly. Declaring it here matters — an
 * undeclared key is stripped by Zod, so omitting it would silently discard the
 * token and force a pointless MFA round-trip.
 */
export const staffLoginResponseSchema = envelope(
  z.object({
    userId: z.string(),
    accessToken: z.string().optional(),
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
