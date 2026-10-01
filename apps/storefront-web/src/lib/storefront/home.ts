import type { z } from 'zod';

import { createStorefrontClient } from '../api';
import { homeResponseSchema, newsletterResponseSchema, type homePayloadSchema } from '../schemas';

export type StorefrontHome = z.infer<typeof homePayloadSchema>;

export async function fetchStorefrontHome(input?: {
  branchId?: string;
  categoryId?: string;
  q?: string;
}): Promise<StorefrontHome> {
  const client = createStorefrontClient();
  const query: Record<string, string> = {};
  if (input?.branchId) query.branchId = input.branchId;
  if (input?.categoryId) query.categoryId = input.categoryId;
  if (input?.q) query.q = input.q;
  const res = await client.request({
    path: 'storefront/home',
    query: Object.keys(query).length > 0 ? query : undefined,
    schema: homeResponseSchema,
  });
  return res.data;
}

export async function subscribeNewsletter(email: string): Promise<{
  email: string;
  alreadySubscribed: boolean;
}> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'storefront/newsletter',
    body: { email, source: 'ember_club' },
    schema: newsletterResponseSchema,
  });
  return res.data;
}
