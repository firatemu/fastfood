import { z } from 'zod';

const responseEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ data, meta: z.unknown().optional() });

export const courierDeliveryStatusSchema = z.enum([
  'UNASSIGNED',
  'ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
  'CANCELLED',
]);

export const courierAssignmentSchema = z.object({
  id: z.string(),
  deliveryId: z.string(),
  courierId: z.string(),
  assignedBy: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.union([z.string(), z.number()]),
});

/** Courier-visible projection of a delivery; does not expose the full order/customer graph. */
export const courierDeliverySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  branchId: z.string(),
  courierId: z.string().nullable(),
  status: courierDeliveryStatusSchema,
  recipientName: z.string().nullable(),
  recipientPhone: z.string().nullable(),
  addressLine: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  deliveryNote: z.string().nullable(),
  navigationUrl: z.string().optional(),
  pickedUpAt: z.union([z.string(), z.null()]),
  deliveredAt: z.union([z.string(), z.null()]),
  assignments: z.array(courierAssignmentSchema),
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()]),
});

export const courierDeliveriesResponseSchema = responseEnvelope(z.array(courierDeliverySchema));
export const courierDeliveryResponseSchema = responseEnvelope(courierDeliverySchema);
export const courierClaimResponseSchema = responseEnvelope(courierDeliverySchema);
export const courierNavigationResponseSchema = responseEnvelope(z.object({ url: z.string() }));
export const courierLocationResponseSchema = responseEnvelope(z.unknown());
export const courierPerformanceResponseSchema = responseEnvelope(
  z.object({
    courierId: z.string(),
    deliveredCount: z.number().int().nonnegative(),
    activeCount: z.number().int().nonnegative(),
    assignedCount: z.number().int().nonnegative(),
  }),
);

export type CourierDelivery = z.infer<typeof courierDeliverySchema>;
export type CourierDeliveryStatus = z.infer<typeof courierDeliveryStatusSchema>;
export type CourierPerformance = z.infer<typeof courierPerformanceResponseSchema>['data'];
