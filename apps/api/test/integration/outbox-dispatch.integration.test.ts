/**
 * Durable outbox dispatch (integration) — document 17 §4.
 *
 * The transactional outbox exists to close one hole: a business mutation and
 * the event that describes it must commit together, or the event must not
 * exist at all. These tests prove that contract against real PostgreSQL, plus
 * the consumer bookkeeping (lease, backoff, dead-letter) that the outbox needs
 * in order to be drainable at all.
 *
 * Follows the same database choice as `persistence-restart.integration.test.ts`:
 * the local development database, which already has migrations and seed applied,
 * with full teardown of the rows this file creates.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/common/database/prisma.service.js';
import { PrismaOutboxWriter } from '../../src/common/outbox/prisma-outbox.writer.js';

const TEST_EVENT = 'Test.OutboxDispatch';
const OWNER_A = 'test-consumer-a';
const OWNER_B = 'test-consumer-b';

let db: PrismaService;
let writer: PrismaOutboxWriter;

function record() {
  return {
    eventType: TEST_EVENT,
    eventVersion: 1,
    aggregateType: 'order',
    aggregateId: null,
    payload: { orderId: '01900000-0000-7000-8000-0000000000ff' },
    createdByUserId: null,
    createdAt: new Date(),
  };
}

async function cleanup(): Promise<void> {
  await db.outboxEvent.deleteMany({ where: { eventType: TEST_EVENT } });
}

describe('durable outbox dispatch (integration)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Local development database (migrations + seed already applied), matching
    // persistence-restart.integration.test.ts.
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://fastfood:fastfood@localhost:5439/fastfood?schema=public';
    db = new PrismaService();
    await db.$connect();
    writer = new PrismaOutboxWriter(db);
    await cleanup();
  });

  // Each test starts from an empty table. Claiming stamps a lease with the
  // consumer clock, so a row left leased by an earlier test would otherwise
  // hide the next one and make these assertions order-dependent.
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    if (db) {
      await cleanup();
      await db.$disconnect();
    }
  });

  describe('atomicity with the business mutation', () => {
    it('persists the event when the surrounding transaction commits', async () => {
      const id = await db.$transaction(async (tx) => {
        await writer.enqueue(record(), tx);
        const row = await tx.outboxEvent.findFirstOrThrow({
          where: { eventType: TEST_EVENT },
          orderBy: { createdAt: 'desc' },
        });
        return row.id;
      });
      const row = await db.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(row.eventType).toBe(TEST_EVENT);
    });

    it('discards the event when the surrounding transaction rolls back', async () => {
      const before = await db.outboxEvent.count({ where: { eventType: TEST_EVENT } });

      await expect(
        db.$transaction(async (tx) => {
          await writer.enqueue(record(), tx);
          throw new Error('force rollback');
        }),
      ).rejects.toThrow('force rollback');

      const after = await db.outboxEvent.count({ where: { eventType: TEST_EVENT } });
      expect(after).toBe(before);
    });
  });

  describe('consumer lease', () => {
    it('claims only the requested event types', async () => {
      // The development database is shared. A claim without a type filter would
      // lease whatever else is pending — real order and cart events — and leave
      // them locked to a test clock, which stalls the running API's consumer.
      await db.outboxEvent.create({
        data: {
          eventType: 'SomeOtherDomainEvent',
          eventVersion: 1,
          aggregateType: 'order',
          aggregateId: null,
          payloadJson: {},
          createdByUserId: null,
          createdAt: new Date(),
        },
      });
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      expect(claimed.every((e) => e.eventType === TEST_EVENT)).toBe(true);

      await db.outboxEvent.deleteMany({ where: { eventType: 'SomeOtherDomainEvent' } });
    });

    it('claims an unpublished event and increments attempts', async () => {
      await writer.enqueue(record());
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      expect(claimed).toHaveLength(1);
      expect(claimed[0]?.attempts).toBe(1);
      expect(claimed[0]?.eventType).toBe(TEST_EVENT);

      const row = await db.outboxEvent.findUniqueOrThrow({ where: { id: claimed[0]!.id } });
      expect(row.lockedBy).toBe(OWNER_A);
      expect(row.lockedAt).not.toBeNull();
      expect(row.publishedAt).toBeNull();
      expect(row.deadLetteredAt).toBeNull();
    });

    it('does not hand a leased event to a second consumer', async () => {
      const again = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_B,
        eventTypes: [TEST_EVENT],
      });
      expect(again).toHaveLength(0);
    });

    it('recovers the event for another consumer once the lease expires', async () => {
      await writer.enqueue(record());
      const first = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      expect(first).toHaveLength(1);
      const id = first[0]!.id;

      // The first consumer is presumed dead: nobody completes the event and
      // the lease is left held. A later poll past the lease window must be able
      // to take it over, otherwise a crashed consumer strands the event.
      const later = new Date(Date.now() + 120_000);
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_B,
        eventTypes: [TEST_EVENT],
        now: later,
      });
      expect(claimed.map((e) => e.id)).toEqual([id]);
      const row = await db.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(row.lockedBy).toBe(OWNER_B);
      expect(row.attempts).toBe(2);
    });
  });

  describe('completion is addressable by id, not by list position', () => {
    it('refuses to publish an event whose lease belongs to another consumer', async () => {
      await writer.enqueue(record());
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      expect(claimed.length).toBeGreaterThan(0);
      const id = claimed[0]!.id;

      const stolen = await writer.markPublishedById(id, OWNER_B);
      expect(stolen).toBe(false);

      const row = await db.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(row.publishedAt).toBeNull();
    });

    it('publishes the event and releases the lease for the lease owner', async () => {
      await writer.enqueue(record());
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      const id = claimed[0]!.id;

      expect(await writer.markPublishedById(id, OWNER_A)).toBe(true);

      const row = await db.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(row.publishedAt).not.toBeNull();
      expect(row.lockedBy).toBeNull();
      expect(row.lockedAt).toBeNull();
    });

    it('never claims a published event again', async () => {
      await writer.enqueue(record());
      await writer.enqueue(record());
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      expect(claimed).toHaveLength(2);
      const publishedId = claimed[0]!.id;
      expect(await writer.markPublishedById(publishedId, OWNER_A)).toBe(true);

      const next = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
        now: new Date(Date.now() + 10 * 60_000),
      });
      const nextIds = next.map((e) => e.id);
      expect(nextIds).not.toContain(publishedId);
      expect(nextIds).toHaveLength(1);
    });
  });

  describe('failure handling', () => {
    it('holds a failed event back until its backoff time passes', async () => {
      await writer.enqueue(record());
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      const id = claimed[0]!.id;

      const retryAt = new Date(Date.now() + 5 * 60_000);
      expect(
        await writer.markFailedById(id, OWNER_A, 'downstream unavailable', {
          nextAttemptAt: retryAt,
          deadLetteredAt: null,
        }),
      ).toBe(true);

      const row = await db.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(row.lockedBy).toBeNull();
      expect(row.lastError).toBe('downstream unavailable');

      // Not yet eligible.
      expect(
        await writer.claimBatch({
          limit: 10,
          leaseMs: 60_000,
          ownerId: OWNER_A,
          eventTypes: [TEST_EVENT],
        }),
      ).toHaveLength(0);

      // Eligible once the backoff window has passed.
      const later = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_B,
        eventTypes: [TEST_EVENT],
        now: new Date(retryAt.getTime() + 1000),
      });
      expect(later.map((e) => e.id)).toContain(id);
    });

    it('stops claiming a dead-lettered event', async () => {
      await writer.enqueue(record());
      const claimed = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_A,
        eventTypes: [TEST_EVENT],
      });
      const id = claimed[0]!.id;

      expect(
        await writer.markFailedById(id, OWNER_A, 'poison event', {
          nextAttemptAt: null,
          deadLetteredAt: new Date(),
        }),
      ).toBe(true);

      const farFuture = new Date(Date.now() + 24 * 60 * 60_000);
      const later = await writer.claimBatch({
        limit: 10,
        leaseMs: 60_000,
        ownerId: OWNER_B,
        eventTypes: [TEST_EVENT],
        now: farFuture,
      });
      expect(later.map((e) => e.id)).not.toContain(id);
    });
  });
});
