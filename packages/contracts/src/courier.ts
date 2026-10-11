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

// ─── Admin courier roster management ───
//
// A courier is an *account*, not just a delivery profile: the admin surface
// creates the login name and the initial password together with the profile
// and the branch roster. These schemas are the shared source of that contract
// so the API and the admin client cannot drift on the rules below.

/**
 * Canonical storage form of a courier username. Applied on the write path so
 * "Deniz.Y" and "deniz.y" can never become two accounts. `en-US` is
 * deliberate: the ASCII-only character rule makes the Turkish dotted/dotless I
 * distinction irrelevant, and pinning the locale keeps Node from following the
 * host locale.
 */
export function normalizeCourierUsername(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

/**
 * Courier login name. Deliberately narrower than a staff e-mail: it is a
 * short, human-typeable handle ("deniz.y") that the courier types into the
 * courier web login, so it is restricted to ASCII lower case plus the three
 * separators that do not need escaping in a URL.
 *
 * The handle is normalised *before* the character rule is applied. A client
 * that sends "Deniz.Y" gets the account "deniz.y" rather than a validation
 * error, which keeps the API no stricter than the rule it documents and makes
 * the uniqueness guarantee hold for every spelling a person might type.
 */
export const courierUsernameSchema = z
  .string()
  .transform(normalizeCourierUsername)
  .pipe(
    z
      .string()
      .min(3)
      .max(32)
      .regex(
        /^[a-z0-9][a-z0-9._-]*$/,
        'Username must start with a letter or digit and may only contain a-z, 0-9, dot, dash or underscore.',
      ),
  );

/** Same 12–256 character policy the staff and customer credentials use. */
export const COURIER_PASSWORD_MIN_LENGTH = 12;
export const COURIER_PASSWORD_MAX_LENGTH = 256;

export const courierPasswordSchema = z
  .string()
  .min(COURIER_PASSWORD_MIN_LENGTH)
  .max(COURIER_PASSWORD_MAX_LENGTH);

/** A branch a courier has been declared for, with the branch display name. */
export const courierBranchRefSchema = z.object({
  branchId: z.string(),
  branchName: z.string(),
  isPrimary: z.boolean(),
});

/** Admin roster row: profile + login identity + explicit branch membership. */
export const adminCourierSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  username: z.string(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  maxActiveDeliveries: z.number(),
  branches: z.array(courierBranchRefSchema),
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()]),
});

const branchIdList = z.array(z.string().uuid()).min(1).max(20);

/**
 * Creating a courier provisions the whole account in one call — profile,
 * username, password and the branches the courier belongs to. A courier with
 * no branch is not a usable state, hence `branchIds.min(1)`.
 */
export const adminCourierCreateSchema = z.object({
  displayName: z.string().min(2).max(128),
  username: courierUsernameSchema,
  password: courierPasswordSchema,
  phone: z.string().min(10).max(32).optional(),
  maxActiveDeliveries: z.number().int().positive().max(20).optional(),
  branchIds: branchIdList,
});

/** Profile edits. Username and password are changed through their own routes. */
export const adminCourierUpdateSchema = z
  .object({
    displayName: z.string().min(2).max(128).optional(),
    phone: z.string().min(10).max(32).nullable().optional(),
    maxActiveDeliveries: z.number().int().positive().max(20).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

/** Replaces the branch roster: the submitted list is the complete new roster. */
export const adminCourierBranchesSchema = z.object({
  branchIds: branchIdList,
});

export const adminCourierPasswordSchema = z.object({
  password: courierPasswordSchema,
});

export const adminCouriersResponseSchema = responseEnvelope(z.array(adminCourierSchema));
export const adminCourierResponseSchema = responseEnvelope(adminCourierSchema);

export type AdminCourier = z.infer<typeof adminCourierSchema>;
export type CourierBranchRef = z.infer<typeof courierBranchRefSchema>;
export type AdminCourierCreateInput = z.infer<typeof adminCourierCreateSchema>;
export type AdminCourierUpdateInput = z.infer<typeof adminCourierUpdateSchema>;
