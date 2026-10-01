/**
 * Phase 8 courier/delivery negative-test matrix (document 39 §10).
 */
import { ErrorCodes } from '@fastfood/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuthGuard } from '../../apps/api/src/modules/auth/guards/auth.guard.js';
import { DeliveryService } from '../../apps/api/src/modules/courier/delivery.service.js';

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

describe('Phase 8 courier/delivery negative-test matrix', () => {
    it('rejects unauthenticated via AuthGuard', async () => {
      const guard = new AuthGuard();
      await expect(guard.canActivate(makeContext({}))).rejects.toThrow(UnauthorizedException);
    });

  it('rejects QR claim with garbage token', async () => {
    const svc = new DeliveryService();
    const courier = await svc.registerCourier({
      userId: '01900000-0000-7000-8000-111111111111',
      displayName: 'Kurye',
    });
    await expect(svc.claimByQr('totally-invalid-token-xx', courier.id)).rejects.toThrow();
  });

  it('rejects location update for unowned delivery', async () => {
    const svc = new DeliveryService();
    const a = await svc.registerCourier({
      userId: '01900000-0000-7000-8000-111111111111',
      displayName: 'A',
    });
    const b = await svc.registerCourier({
      userId: '01900000-0000-7000-8000-222222222222',
      displayName: 'B',
    });
    const delivery = await svc.createDelivery({
      orderId: '01900000-0000-7000-8000-eeeeeeeeeeee',
      branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
    });
    await svc.assign(delivery.id, a.id);
    await expect(
      svc.recordLocation({
        courierId: b.id,
        deliveryId: delivery.id,
        latitude: 41,
        longitude: 29,
      }),
    ).rejects.toThrow();
  });

  it('correct-scope claim + pickup succeeds', async () => {
    const svc = new DeliveryService();
    const courier = await svc.registerCourier({
      userId: '01900000-0000-7000-8000-111111111111',
      displayName: 'Kurye',
    });
    const delivery = await svc.createDelivery({
      orderId: '01900000-0000-7000-8000-eeeeeeeeeeee',
      branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
      latitude: 41.03,
      longitude: 28.98,
    });
    const token = await svc.issueQrClaimToken(delivery.id);
    await svc.claimByQr(token.token, courier.id);
    const picked = await svc.pickup(delivery.id, courier.id);
    expect(picked.status).toBe('PICKED_UP');
  });

  it('ErrorCodes for courier envelope exist', () => {
    expect(ErrorCodes.QR_CLAIM_INVALID).toBeTruthy();
    expect(ErrorCodes.DELIVERY_ALREADY_ASSIGNED).toBeTruthy();
    expect(ErrorCodes.DELIVERY_COURIER_LIMIT_REACHED).toBeTruthy();
  });
});
