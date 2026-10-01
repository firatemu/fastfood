/**
 * Phase 6 loyalty reservation unit tests.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { LoyaltyService } from '../../src/modules/loyalty/loyalty.service.js';

describe('Phase 6 LoyaltyService', () => {
  it('reserves points and reduces balance', async () => {
    const svc = new LoyaltyService();
    await svc.setBalance('user-1', 1000n);
    const reservation = await svc.reserve({ userId: 'user-1', points: 250n });
    expect(reservation.pointsReserved).toBe(250n);
    expect(reservation.valueMinor).toBe(250n);
    expect(reservation.status).toBe('ACTIVE');
    expect(await svc.getBalance('user-1')).toBe(750n);
  });

  it('rejects reserve above balance', async () => {
    const svc = new LoyaltyService();
    await svc.setBalance('user-1', 10n);
    await expect(svc.reserve({ userId: 'user-1', points: 50n })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('releases reservation and restores balance', async () => {
    const svc = new LoyaltyService();
    await svc.setBalance('user-1', 100n);
    const reservation = await svc.reserve({ userId: 'user-1', points: 40n });
    const released = await svc.release(reservation.id, 'user-1');
    expect(released.status).toBe('RELEASED');
    expect(await svc.getBalance('user-1')).toBe(100n);
  });
});
