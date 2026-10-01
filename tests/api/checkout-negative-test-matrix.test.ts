/**
 * Phase 6 checkout/loyalty/payment negative-test matrix (document 39 §10).
 */
import { ErrorCodes } from '@fastfood/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { IdempotencyService } from '../../apps/api/src/common/idempotency/idempotency.service.js';
import { AuthGuard } from '../../apps/api/src/modules/auth/guards/auth.guard.js';
import { LoyaltyService } from '../../apps/api/src/modules/loyalty/loyalty.service.js';
import { PaymentService } from '../../apps/api/src/modules/payment/payment.service.js';

function makeContext(req: { authenticatedUserId?: string }) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class Fake {},
    getArgs: () => [],
    getArgByIndex: <T>(_i: number): T => undefined as T,
    switchToRpc: () => {
      throw new Error('n/a');
    },
    switchToWs: () => {
      throw new Error('n/a');
    },
    getType: () => 'http',
  };
}

describe('Phase 6 checkout/loyalty/payment negative-test matrix', () => {
    it('rejects unauthenticated via AuthGuard', async () => {
      const guard = new AuthGuard();
      await expect(guard.canActivate(makeContext({}))).rejects.toThrow(UnauthorizedException);
    });

  it('rejects loyalty reserve above balance (wrong-scope / insufficient)', async () => {
    const loyalty = new LoyaltyService();
    await loyalty.setBalance('user-a', 5n);
    await expect(loyalty.reserve({ userId: 'user-a', points: 50n })).rejects.toThrow();
  });

  it('rejects loyalty release for another user (wrong ownership)', async () => {
    const loyalty = new LoyaltyService();
    await loyalty.setBalance('user-a', 100n);
    const reservation = await loyalty.reserve({ userId: 'user-a', points: 10n });
    await expect(loyalty.release(reservation.id, 'user-b')).rejects.toThrow();
  });

  it('correct-scope loyalty reserve succeeds', async () => {
    const loyalty = new LoyaltyService();
    await loyalty.setBalance('user-a', 100n);
    const reservation = await loyalty.reserve({ userId: 'user-a', points: 10n });
    expect(reservation.status).toBe('ACTIVE');
  });

  it('payment initialize with zero amount fails provider path', async () => {
    const payments = new PaymentService(new IdempotencyService());
    const result = await payments.initialize({
      checkoutSessionId: '01900000-0000-7000-8000-eeeeeeeeeeee',
      amountMinor: 0n,
      currency: 'TRY',
      idempotencyKey: 'idem-neg-zero-amount',
    });
    expect(result.provider.status).toBe('FAILED');
  });

  it('checkout status unknown id returns null (NOT_FOUND path)', async () => {
    const payments = new PaymentService(new IdempotencyService());
    const missing = await payments.refreshStatus('01900000-0000-7000-8000-ffffffffffff');
    expect(missing).toBeNull();
  });

  it('ErrorCodes used by checkout auth envelope exist', () => {
    expect(ErrorCodes.AUTH_UNAUTHENTICATED).toBeTruthy();
    expect(ErrorCodes.NOT_FOUND).toBeTruthy();
    expect(ErrorCodes.VALIDATION_ERROR).toBeTruthy();
  });
});
