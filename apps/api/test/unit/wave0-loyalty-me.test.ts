/**
 * Wave 0 — GET /me/loyalty balance via LoyaltyService.
 */
import { describe, expect, it } from 'vitest';

import { LoyaltyService } from '../../src/modules/loyalty/loyalty.service.js';

describe('Wave 0 customer loyalty balance', () => {
  it('returns zero balance for unknown user', async () => {
    const loyalty = new LoyaltyService();
    const balance = await loyalty.getBalance('01900000-0000-7000-8000-999999999999');
    expect(balance).toBe(0n);
  });

  it('reflects setBalance in memory mode', async () => {
    const loyalty = new LoyaltyService();
    const userId = '01900000-0000-7000-8000-888888888888';
    await loyalty.setBalance(userId, 500n);
    expect(await loyalty.getBalance(userId)).toBe(500n);
  });
});
