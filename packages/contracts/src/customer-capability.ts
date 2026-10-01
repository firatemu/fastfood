/**
 * Machine-readable BURGER HOME customer capability registry.
 *
 * Impact and implementation status are separate. Seeded from the completed
 * Storefront and Mobile matrices; do not invent capabilities here.
 */
import { z } from 'zod';

export const CUSTOMER_CAPABILITY_IMPACTS = [
  'AUTOMATICALLY_SUPPORTED',
  'CHANGE_REQUIRED',
  'NOT_APPLICABLE',
] as const;
export type CustomerCapabilityImpact = (typeof CUSTOMER_CAPABILITY_IMPACTS)[number];

export const CUSTOMER_CAPABILITY_STATUSES = [
  'IMPLEMENTED',
  'IMPLEMENTED_WITH_INTENTIONAL_DEVIATION',
  'EXTERNAL_PROVIDER_BLOCKED',
  'DEFERRED_WITH_APPROVED_REASON',
  'NOT_RELEVANT',
  'MISSING',
] as const;
export type CustomerCapabilityStatus = (typeof CUSTOMER_CAPABILITY_STATUSES)[number];

export const customerCapabilityEntrySchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'capability id must be kebab-case'),
  name: z.string().min(1),
  backend: z.string().min(1),
  webImpact: z.enum(CUSTOMER_CAPABILITY_IMPACTS),
  webStatus: z.enum(CUSTOMER_CAPABILITY_STATUSES),
  mobileImpact: z.enum(CUSTOMER_CAPABILITY_IMPACTS),
  mobileStatus: z.enum(CUSTOMER_CAPABILITY_STATUSES),
  notes: z.string(),
});

export type CustomerCapabilityEntry = z.infer<typeof customerCapabilityEntrySchema>;

export const customerCapabilityRegistrySchema = z
  .array(customerCapabilityEntrySchema)
  .min(1);

export class CustomerCapabilityRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerCapabilityRegistryError';
  }
}

function assertClientConsistency(
  entry: CustomerCapabilityEntry,
  client: 'web' | 'mobile',
): void {
  const impact = client === 'web' ? entry.webImpact : entry.mobileImpact;
  const status = client === 'web' ? entry.webStatus : entry.mobileStatus;
  if (status === 'EXTERNAL_PROVIDER_BLOCKED' && impact === 'NOT_APPLICABLE') {
    throw new CustomerCapabilityRegistryError(
      `${entry.id} ${client}: EXTERNAL_PROVIDER_BLOCKED must use CHANGE_REQUIRED, not NOT_APPLICABLE`,
    );
  }
}

export function validateCustomerCapabilityRegistry(
  input: unknown,
): CustomerCapabilityEntry[] {
  const parsed = customerCapabilityRegistrySchema.parse(input);
  const seen = new Set<string>();
  const missing: string[] = [];

  for (const entry of parsed) {
    if (seen.has(entry.id)) {
      throw new CustomerCapabilityRegistryError(`duplicate capability id: ${entry.id}`);
    }
    seen.add(entry.id);
    if (entry.webStatus === 'MISSING' || entry.mobileStatus === 'MISSING') {
      missing.push(entry.id);
    }
    assertClientConsistency(entry, 'web');
    assertClientConsistency(entry, 'mobile');
  }

  if (missing.length > 0) {
    throw new CustomerCapabilityRegistryError(
      `completed baseline forbids MISSING: ${missing.join(', ')}`,
    );
  }

  return parsed;
}
