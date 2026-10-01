import type { z } from 'zod';

import type { orderSummaryResponseSchema } from './schemas';

export type OrderSummaryResponse = z.infer<typeof orderSummaryResponseSchema>;
