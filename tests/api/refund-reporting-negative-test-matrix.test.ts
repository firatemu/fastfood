/**
 * Phase 9 refund/reporting negative-test matrix.
 */
import { ErrorCodes } from '@fastfood/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuthGuard } from '../../apps/api/src/modules/auth/guards/auth.guard.js';
import { RefundService } from '../../apps/api/src/modules/refund/refund.service.js';

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

describe('Phase 9 refund/reporting negative-test matrix', () => {
    it('rejects unauthenticated via AuthGuard', async () => {
      await expect(new AuthGuard().canActivate(makeContext({}))).rejects.toThrow(
        UnauthorizedException,
      );
    });

  it('rejects over-refund (REFUND_NOT_ALLOWED)', async () => {
    const svc = new RefundService();
    await svc.registerPaidPayment({ id: 'pay-1', amountMinor: 1000n });
    await expect(svc.create({ paymentId: 'pay-1', amountMinor: 2000n })).rejects.toThrow();
  });

  it('correct-scope partial refund succeeds', async () => {
    const svc = new RefundService();
    await svc.registerPaidPayment({ id: 'pay-1', amountMinor: 5000n });
    const refund = await svc.create({ paymentId: 'pay-1', amountMinor: 1000n });
    expect(refund.status).toBe('SUCCEEDED');
  });

  it('ErrorCodes for refund envelope exist', () => {
    expect(ErrorCodes.REFUND_NOT_ALLOWED).toBeTruthy();
    expect(ErrorCodes.AUTH_UNAUTHENTICATED).toBeTruthy();
  });
});
