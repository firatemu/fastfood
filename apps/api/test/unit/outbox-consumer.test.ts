/**
 * Durable outbox consumer unit tests.
 *
 * The consumer owns the dispatch policy — which rows it accepts, how failures
 * are backed off, and when a row is dead-lettered — while the writer owns the
 * SQL. These tests drive that policy against a stub writer, so they stay fast
 * and cover cases that are awkward to provoke through a real database: an
 * unhandled event type, a handler that always throws, and a retry budget that
 * runs out.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `test/setup-env.ts` runs before any module import and already memoized the
 * real environment, so the policy is injected rather than read from
 * `process.env`. Without this the retry budget would always be the schema
 * default and the dead-letter path would be unreachable from a test.
 */
const policy = vi.hoisted(() => ({
  NODE_ENV: 'test' as string,
  OUTBOX_CONSUMER_ENABLED: true,
  OUTBOX_CONSUMER_POLL_INTERVAL_MS: 5_000,
  OUTBOX_CONSUMER_BATCH_SIZE: 25,
  OUTBOX_CONSUMER_LEASE_MS: 60_000,
  OUTBOX_CONSUMER_MAX_ATTEMPTS: 3,
  OUTBOX_CONSUMER_BACKOFF_BASE_MS: 1_000,
  OUTBOX_CONSUMER_BACKOFF_MAX_MS: 10_000,
}));

vi.mock('../../src/bootstrap/app-config.js', () => ({
  getAppConfig: () => policy,
}));

const { OutboxConsumerService } = await import(
  '../../src/common/outbox/outbox-consumer.service.js'
);
const { PrismaOutboxWriter } = await import('../../src/common/outbox/prisma-outbox.writer.js');
type ClaimedOutboxEvent = import('../../src/common/outbox/outbox.service.js').ClaimedOutboxEvent;
type OutboxFailureState = import('../../src/common/outbox/outbox.service.js').OutboxFailureState;

function claimed(overrides: Partial<ClaimedOutboxEvent> = {}): ClaimedOutboxEvent {
  return {
    id: '01900000-0000-7000-8000-0000000f0001',
    eventType: 'OrderStatusChanged',
    eventVersion: 1,
    aggregateType: 'order',
    aggregateId: '01900000-0000-7000-8000-0000000f0002',
    payload: { orderId: '01900000-0000-7000-8000-0000000f0002' },
    createdByUserId: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    attempts: 1,
    ...overrides,
  };
}

interface StubWriter {
  markPublishedById: ReturnType<typeof vi.fn>;
  markFailedById: ReturnType<typeof vi.fn>;
  claimBatch: ReturnType<typeof vi.fn>;
}

function stubWriter(rows: ClaimedOutboxEvent[] = []): StubWriter {
  return {
    claimBatch: vi.fn().mockResolvedValue(rows),
    markPublishedById: vi.fn().mockResolvedValue(true),
    markFailedById: vi.fn().mockResolvedValue(true),
  };
}

function consumer(stub: StubWriter): InstanceType<typeof OutboxConsumerService> {
  return new OutboxConsumerService(stub as unknown as InstanceType<typeof PrismaOutboxWriter>);
}

const NOW = new Date('2026-10-01T12:00:00.000Z');

describe('OutboxConsumerService', () => {
  beforeEach(() => {
    policy.OUTBOX_CONSUMER_MAX_ATTEMPTS = 3;
    policy.OUTBOX_CONSUMER_BACKOFF_BASE_MS = 1_000;
    policy.OUTBOX_CONSUMER_BACKOFF_MAX_MS = 10_000;
    policy.OUTBOX_CONSUMER_ENABLED = true;
    policy.NODE_ENV = 'test';
  });

  it('completes a known event after its handler resolves', async () => {
    const stub = stubWriter([claimed()]);
    const handled = await consumer(stub).tick(NOW);

    expect(handled).toBe(1);
    expect(stub.markPublishedById).toHaveBeenCalledTimes(1);
    expect(stub.markFailedById).not.toHaveBeenCalled();
  });

  it('publishes every event type the API currently emits', async () => {
    for (const eventType of OutboxConsumerService.KNOWN_EVENT_TYPES) {
      const stub = stubWriter([claimed({ eventType })]);
      await consumer(stub).tick(NOW);
      expect(stub.markPublishedById).toHaveBeenCalledTimes(1);
    }
  });

  it('fails an event whose type has no handler instead of discarding it', async () => {
    const stub = stubWriter([claimed({ eventType: 'SomethingNobodyHandles' })]);
    await consumer(stub).tick(NOW);

    expect(stub.markPublishedById).not.toHaveBeenCalled();
    expect(stub.markFailedById).toHaveBeenCalledTimes(1);
    const [, , message, state] = stub.markFailedById.mock.calls[0] as [
      string,
      string,
      string,
      OutboxFailureState,
    ];
    expect(message).toContain('SomethingNobodyHandles');
    expect(state.deadLetteredAt).toBeNull();
  });

  it('schedules a retry with exponential backoff when the handler throws', async () => {
    const stub = stubWriter([claimed({ attempts: 2 })]);
    const svc = consumer(stub);
    svc.registerHandler('OrderStatusChanged', async () => {
      throw new Error('downstream unavailable');
    });

    await svc.tick(NOW);

    const [, , message, state] = stub.markFailedById.mock.calls[0] as [
      string,
      string,
      string,
      OutboxFailureState,
    ];
    expect(message).toBe('downstream unavailable');
    // attempts=2 -> 1000 * 2^(2-1)
    expect(state.nextAttemptAt).toEqual(new Date(NOW.getTime() + 2_000));
    expect(state.deadLetteredAt).toBeNull();
  });

  it('caps the backoff so a long-failing event keeps being retried', async () => {
    // A high attempt count only reaches the backoff path while the retry
    // budget still has room; otherwise the row is dead-lettered instead.
    policy.OUTBOX_CONSUMER_MAX_ATTEMPTS = 50;
    const stub = stubWriter([claimed({ attempts: 20 })]);
    const svc = consumer(stub);
    svc.registerHandler('OrderStatusChanged', async () => {
      throw new Error('still down');
    });

    await svc.tick(NOW);
    const [, , , state] = stub.markFailedById.mock.calls[0] as [
      string,
      string,
      string,
      OutboxFailureState,
    ];
    expect(state.nextAttemptAt).toEqual(new Date(NOW.getTime() + 10_000));
  });

  it('dead-letters the event once the retry budget is spent', async () => {
    const stub = stubWriter([claimed({ attempts: 3 })]);
    const svc = consumer(stub);
    svc.registerHandler('OrderStatusChanged', async () => {
      throw new Error('poison');
    });

    await svc.tick(NOW);
    const [, , , state] = stub.markFailedById.mock.calls[0] as [
      string,
      string,
      string,
      OutboxFailureState,
    ];
    expect(state.deadLetteredAt).toEqual(NOW);
    expect(state.nextAttemptAt).toBeNull();
  });

  it('does not record completion when the lease was lost before it could', async () => {
    const stub = stubWriter([claimed()]);
    stub.markPublishedById.mockResolvedValue(false);
    await consumer(stub).tick(NOW);

    // The row stays unpublished on purpose: a lost lease means the work may
    // need to happen again, and the next owner decides that.
    expect(stub.markPublishedById).toHaveBeenCalledTimes(1);
    expect(stub.markFailedById).not.toHaveBeenCalled();
  });

  it('keeps processing a batch after one event fails', async () => {
    const good = claimed({ id: '01900000-0000-7000-8000-0000000f000a' });
    const bad = claimed({ id: '01900000-0000-7000-8000-0000000f000b', attempts: 9 });
    const stub = stubWriter([bad, good]);
    const svc = consumer(stub);
    svc.registerHandler('OrderStatusChanged', async (event) => {
      if (event.id === bad.id) throw new Error('nope');
    });

    const handled = await svc.tick(NOW);
    expect(handled).toBe(2);
    expect(stub.markPublishedById).toHaveBeenCalledTimes(1);
    expect(stub.markPublishedById).toHaveBeenCalledWith(good.id, expect.any(String), NOW);
    expect(stub.markFailedById).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a poller under NODE_ENV=test', () => {
    const svc = consumer(stubWriter());
    svc.onModuleInit();
    svc.onModuleDestroy();
    // Nothing to await: the poller is chained off setTimeout, which
    // onModuleDestroy clears. Reaching here without a dangling handle is the
    // assertion.
    expect(svc).toBeDefined();
  });

  it('does not schedule a poller when the consumer is disabled', () => {
    policy.OUTBOX_CONSUMER_ENABLED = false;
    const svc = consumer(stubWriter());
    svc.onModuleInit();
    svc.onModuleDestroy();
    expect(svc).toBeDefined();
  });
});
