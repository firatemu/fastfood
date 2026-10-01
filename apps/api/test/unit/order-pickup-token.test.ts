/**
 * OrderPickupTokenService unit tests (Phase Admin Receipt feature).
 */
import { describe, expect, it } from 'vitest';

import { OrderPickupTokenService, generateToken } from '../../src/modules/order/order-pickup-token.service.js';

describe('generateToken', () => {
  it('returns a PICKUP- prefix + random hex', () => {
    const { token, prefix, hash } = generateToken();
    expect(token).toMatch(/^PICKUP-[0-9A-F]{16}$/);
    expect(prefix).toBe(token);
    expect(hash).toHaveLength(64);
  });
});

describe('OrderPickupTokenService (in-memory fallback)', () => {
  it('issues a token once and rejects duplicates until consumed/expired', async () => {
    const svc = new OrderPickupTokenService();
    const first = await svc.issueForOrder('order-1');
    expect(first.record.orderId).toBe('order-1');
    expect(first.record.tokenPrefix).toMatch(/^PICKUP-/);
    await expect(svc.issueForOrder('order-1')).rejects.toThrow();
  });

  it('consumes by prefix and records courier id', async () => {
    const svc = new OrderPickupTokenService();
    const issued = await svc.issueForOrder('order-2');
    const consumed = await svc.consumeByPrefix(issued.record.tokenPrefix, 'courier-42');
    expect(consumed.consumedAt).toBeInstanceOf(Date);
    expect(consumed.consumedByCourierId).toBe('courier-42');
    await expect(svc.consumeByPrefix(issued.record.tokenPrefix, 'courier-42')).rejects.toThrow();
  });

  it('rejects unknown prefixes with NotFound', async () => {
    const svc = new OrderPickupTokenService();
    await expect(svc.consumeByPrefix('PICKUP-DEADBEEF', 'c')).rejects.toThrow(/bulunamadı/);
  });

  it('looks up the latest token by order', async () => {
    const svc = new OrderPickupTokenService();
    await svc.issueForOrder('order-3');
    const found = await svc.findByOrder('order-3');
    expect(found?.orderId).toBe('order-3');
  });
});
