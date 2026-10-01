/**
 * Unit tests for the Phase 3 AuditLog + OutboxEvent primitives.
 *
 * Document 18 §8 (AuditLog — append-only) + document 17 §4
 * (transactional outbox).
 */
import { describe, expect, it } from 'vitest';

import { ActorType } from '@fastfood/domain-types';

import { InMemoryAuditLogWriter } from '../../src/common/audit/audit.service.js';
import { InMemoryOutboxWriter } from '../../src/common/outbox/outbox.service.js';

describe('Phase 3 AuditLog + Outbox primitives', () => {
  it('AuditLog.append records an event', async () => {
    const writer = new InMemoryAuditLogWriter();
    await writer.append({
      actorUserId: '01900000-0000-7000-8000-000000000001',
      actorType: ActorType.STAFF,
      action: 'staff.created',
      resourceType: 'staff',
      resourceId: '01900000-0000-7000-8000-000000000002',
      branchId: null,
      requestId: '01900000-0000-7000-8000-000000000003',
      correlationId: null,
      priorValues: null,
      newValues: { name: 'Alice' },
      reason: null,
      ipAddress: null,
      userAgent: null,
    });
    const list = await writer.list();
    expect(list.length).toBe(1);
    expect(list[0]?.action).toBe('staff.created');
  });

  it('AuditLog.list filters by resourceType', async () => {
    const writer = new InMemoryAuditLogWriter();
    await writer.append({
      actorUserId: '01900000-0000-7000-8000-000000000001',
      actorType: ActorType.STAFF,
      action: 'staff.created',
      resourceType: 'staff',
      resourceId: null,
      branchId: null,
      requestId: null,
      correlationId: null,
      priorValues: null,
      newValues: null,
      reason: null,
      ipAddress: null,
      userAgent: null,
    });
    await writer.append({
      actorUserId: '01900000-0000-7000-8000-000000000001',
      actorType: ActorType.STAFF,
      action: 'role.granted',
      resourceType: 'role',
      resourceId: null,
      branchId: null,
      requestId: null,
      correlationId: null,
      priorValues: null,
      newValues: null,
      reason: null,
      ipAddress: null,
      userAgent: null,
    });
    const filtered = await writer.list({ resourceType: 'staff' });
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.resourceType).toBe('staff');
  });

  it('Outbox.enqueue records an event', async () => {
    const writer = new InMemoryOutboxWriter();
    await writer.enqueue({
      eventType: 'OrderPaid',
      eventVersion: 1,
      aggregateType: 'order',
      aggregateId: '01900000-0000-7000-8000-000000000001',
      payload: { totalMinor: '12990' },
      createdByUserId: null,
      createdAt: new Date(),
    });
    const list = await writer.list();
    expect(list.length).toBe(1);
    expect(list[0]?.eventType).toBe('OrderPaid');
  });

  it('Outbox.markPublished transitions an event', async () => {
    const writer = new InMemoryOutboxWriter();
    await writer.enqueue({
      eventType: 'OrderPaid',
      eventVersion: 1,
      aggregateType: 'order',
      aggregateId: '01900000-0000-7000-8000-000000000001',
      payload: { totalMinor: '12990' },
      createdByUserId: null,
      createdAt: new Date(),
    });
    await writer.markPublished(0);
    const unpublished = await writer.list({ published: false });
    const published = await writer.list({ published: true });
    expect(unpublished.length).toBe(0);
    expect(published.length).toBe(1);
  });

  it('Outbox.markPublished rejects out-of-range index', async () => {
    const writer = new InMemoryOutboxWriter();
    await expect(writer.markPublished(99)).rejects.toThrow(/out of range/);
  });
});
