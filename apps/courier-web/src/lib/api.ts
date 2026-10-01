import { ApiClient } from '@fastfood/api-client';
import {
  courierClaimResponseSchema,
  courierDeliveriesResponseSchema,
  courierDeliveryResponseSchema,
  courierNavigationResponseSchema,
  courierPerformanceResponseSchema,
} from '@fastfood/contracts';
import { z } from 'zod';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const session = { accessToken: undefined as string | undefined };
export const setAccessToken = (value?: string) => { session.accessToken = value; };
export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => session.accessToken,
  fetchImpl: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});

export const authResponse = z.object({ data: z.object({ userId: z.string(), accessToken: z.string().optional(), mfaRequired: z.boolean().optional() }), meta: z.unknown().optional() });
export const refreshResponse = z.object({ data: z.object({ userId: z.string(), accessToken: z.string() }), meta: z.unknown().optional() });
export const deliveriesResponseSchema = courierDeliveriesResponseSchema;
export const deliveryResponseSchema = courierDeliveryResponseSchema;
export const claimResponseSchema = courierClaimResponseSchema;
export const navigationResponseSchema = courierNavigationResponseSchema;
export const performanceResponseSchema = courierPerformanceResponseSchema;
