/**
 * Phase 8 DeliveryService unit tests (document 15).
 */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { canDeliveryTransition } from '../../src/modules/courier/delivery-state-machine.js';
import { DeliveryService } from '../../src/modules/courier/delivery.service.js';

const BRANCH = '01900000-0000-7000-8000-faaaaaaaaaaa';
const ORDER = '01900000-0000-7000-8000-eeeeeeeeeeee';
const USER = '01900000-0000-7000-8000-111111111111';

async function seed() {
  const svc = new DeliveryService();
  const courier = await svc.registerCourier({
    userId: USER,
    displayName: 'Ali Kurye',
    maxActiveDeliveries: 2,
  });
  const delivery = await svc.createDelivery({
    orderId: ORDER,
    branchId: BRANCH,
    latitude: 41.0369,
    longitude: 28.9847,
    addressLine: 'Istiklal 1',
  });
  return { svc, courier, delivery };
}

describe('Phase 8 delivery state machine', () => {
  it('allows the happy path', async () => {
    expect(canDeliveryTransition('UNASSIGNED', 'ASSIGNED')).toBe(true);
    expect(canDeliveryTransition('ASSIGNED', 'PICKED_UP')).toBe(true);
    expect(canDeliveryTransition('PICKED_UP', 'ON_THE_WAY')).toBe(true);
    expect(canDeliveryTransition('ON_THE_WAY', 'DELIVERED')).toBe(true);
  });
});

describe('Phase 8 DeliveryService', () => {
  it('manually assigns a courier', async () => {
    const { svc, courier, delivery } = await seed();
    const assigned = await svc.assign(delivery.id, courier.id, { reason: 'manual' });
    expect(assigned.status).toBe('ASSIGNED');
    expect(assigned.courierId).toBe(courier.id);
    expect(assigned.assignments.length).toBe(1);
  });

  it('claims via opaque QR token atomically', async () => {
    const { svc, courier, delivery } = await seed();
    const issued = await svc.issueQrClaimToken(delivery.id);
    const claimed = await svc.claimByQr(issued.token, courier.id);
    expect(claimed.status).toBe('ASSIGNED');
    expect(claimed.courierId).toBe(courier.id);
    await expect(svc.claimByQr(issued.token, courier.id)).rejects.toThrow(ConflictException);
  });

  it('rejects invalid QR token', async () => {
    const { svc, courier } = await seed();
    await expect(svc.claimByQr('not-a-real-token-value-xx', courier.id)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('runs pickup → on-the-way → deliver', async () => {
    const { svc, courier, delivery } = await seed();
    await svc.assign(delivery.id, courier.id);
    await svc.pickup(delivery.id, courier.id);
    await svc.onTheWay(delivery.id, courier.id);
    const done = await svc.deliver(delivery.id, courier.id);
    expect(done.status).toBe('DELIVERED');
    expect(done.deliveredAt).toBeTruthy();
  });

  it('records live location for owned active delivery', async () => {
    const { svc, courier, delivery } = await seed();
    await svc.assign(delivery.id, courier.id);
    const point = await svc.recordLocation({
      courierId: courier.id,
      deliveryId: delivery.id,
      latitude: 41.04,
      longitude: 28.99,
      accuracyM: 12,
    });
    expect(point.courierId).toBe(courier.id);
  });

  it('builds Google Maps navigation URL from coordinates', async () => {
    const { svc, courier, delivery } = await seed();
    await svc.assign(delivery.id, courier.id);
    const url = await svc.mapsNavigationUrl(delivery.id);
    expect(url).toContain('google.com/maps');
    expect(url).toContain('41.0369');
  });

  it('enforces active delivery capacity', async () => {
    const { svc, courier } = await seed();
    const d1 = await svc.createDelivery({
      orderId: '01900000-0000-7000-8000-eeeeeeeeeee1',
      branchId: BRANCH,
    });
    const d2 = await svc.createDelivery({
      orderId: '01900000-0000-7000-8000-eeeeeeeeeee2',
      branchId: BRANCH,
    });
    const d3 = await svc.createDelivery({
      orderId: '01900000-0000-7000-8000-eeeeeeeeeee3',
      branchId: BRANCH,
    });
    await svc.assign(d1.id, courier.id);
    await svc.assign(d2.id, courier.id);
    await expect(svc.assign(d3.id, courier.id)).rejects.toThrow(BadRequestException);
  });

  it('exposes courier performance metrics', async () => {
    const { svc, courier, delivery } = await seed();
    await svc.assign(delivery.id, courier.id);
    await svc.pickup(delivery.id, courier.id);
    await svc.onTheWay(delivery.id, courier.id);
    await svc.deliver(delivery.id, courier.id);
    const perf = await svc.performance(courier.id);
    expect(perf.deliveredCount).toBe(1);
  });
});
