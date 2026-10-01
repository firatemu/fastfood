/**
 * Canonical API response envelope.
 *
 * Document 40:
 *   - Single-resource success: { data, meta }
 *   - List success:            { data, meta: { ..., pagination } }
 *   - Error:                   { error: { code, message, details, requestId } }
 *
 * This contract is the only shape that leaves the backend. Backend modules must
 * not return ad-hoc { success: true } or raw Prisma objects.
 */
import { z } from 'zod';

/** Generic UUID string — used for IDs, request/correlation IDs, etc. */
export const uuidSchema = z.string().uuid();

/** ISO 8601 UTC string. */
export const isoUtcDateTimeSchema = z.string().datetime({ offset: true });

/** Base-10 integer string representing minor units (kuruş). See document 37 §5. */
export const moneyMinorStringSchema = z
  .string()
  .regex(/^-?\d+$/, { message: 'money must be a base-10 integer string of minor units' });

/** Pagination metadata shared by every paginated list endpoint. */
export const paginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** Response meta envelope — present on every successful response. */
export const responseMetaSchema = z.object({
  requestId: uuidSchema,
  pagination: paginationSchema.optional(),
});
export type ResponseMeta = z.infer<typeof responseMetaSchema>;

/** Canonical error envelope. */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().nullable().optional(),
    requestId: uuidSchema,
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** Helper to construct a success envelope shape for a given data schema. */
export function successEnvelope<TData extends z.ZodTypeAny>(dataSchema: TData) {
  return z.object({
    data: dataSchema,
    meta: responseMetaSchema,
  });
}

/** Helper to construct a list success envelope. */
export function listEnvelope<TItem extends z.ZodTypeAny>(itemSchema: TItem) {
  return z.object({
    data: z.array(itemSchema),
    meta: responseMetaSchema.extend({
      pagination: paginationSchema,
    }),
  });
}
