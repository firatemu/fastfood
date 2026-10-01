import { Injectable } from '@nestjs/common';

import {
  computePricingQuote,
  type PricingQuoteInput,
  type PricingQuoteResult,
} from './pricing.engine.js';

/**
 * Nest-facing pricing service wrapping the pure document 37 engine.
 */
@Injectable()
export class PricingService {
  quote(input: PricingQuoteInput): PricingQuoteResult {
    return computePricingQuote(input);
  }
}
