import { Injectable, Logger } from '@nestjs/common';

/**
 * Transactional outbox writer (document 17 §4 + 31 "OutboxEvent").
 *
 * A business mutation and the event that describes it must commit together.
 * The caller therefore opens `prisma.$transaction(...)`, performs the mutation
 * and the `enqueue(...)` on the SAME transaction client, so PostgreSQL either
 * commits both or neither. Publishing an event before that commit is forbidden.
 *
 * A separate consumer drains the rows afterwards. It claims work with a lease
 * so two consumers cannot process the same event concurrently, retries with
 * backoff, and finally dead-letters rows it cannot deliver.
 */

export interface OutboxEventRecord {
  readonly id?: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregateType: string | null;
  readonly aggregateId: string | null;
  readonly payload: Record<string, unknown>;
  readonly createdByUserId: string | null;
  readonly createdAt: Date;
}

/** An unpublished row leased to one consumer. */
export interface ClaimedOutboxEvent extends OutboxEventRecord {
  readonly id: string;
  readonly attempts: number;
}

export interface OutboxClaimOptions {
  /** Maximum rows to lease in one call. */
  readonly limit: number;
  /** How long the lease is held before another consumer may take the row. */
  readonly leaseMs: number;
  /** Consumer identity recorded in `locked_by`. */
  readonly ownerId: string;
  /**
   * Restrict the batch to these event types.
   *
   * Omit it to claim every type, which is what the API consumer does so that
   * an event it has no handler for is still reported rather than sitting
   * unnoticed. A consumer that deliberately handles a subset passes its types
   * here, which is what lets one consumer be deployed per domain and lets a
   * test claim only the rows it created instead of leasing whatever else is
   * pending in the shared development database.
   */
  readonly eventTypes?: readonly string[];
  /** Injectable clock for tests. */
  readonly now?: Date;
}

/** How a failed delivery should be recorded. */
export interface OutboxFailureState {
  /** When the next attempt may start. `null` means "immediately eligible". */
  readonly nextAttemptAt: Date | null;
  /** Set once the retry budget is exhausted; the row stops being claimed. */
  readonly deadLetteredAt: Date | null;
}

export interface OutboxWriter {
  /**
   * Append one event.
   *
   * `client` is the Prisma client or an open transaction client. Pass the
   * transaction client to make the event atomic with a business mutation.
   */
  enqueue(event: OutboxEventRecord, client?: unknown): Promise<void>;
  list(filter?: { eventType?: string; published?: boolean }): Promise<readonly OutboxEventRecord[]>;
}

@Injectable()
export class InMemoryOutboxWriter implements OutboxWriter {
  readonly #events: OutboxEventRecord[] = [];
  readonly #published = new Set<number>();
  readonly #logger = new Logger(InMemoryOutboxWriter.name);

  async enqueue(event: OutboxEventRecord): Promise<void> {
    this.#events.push(event);
    this.#logger.log({
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
    });
  }

  async list(
    filter: { eventType?: string; published?: boolean } = {},
  ): Promise<readonly OutboxEventRecord[]> {
    let events = [...this.#events];
    if (filter.eventType) {
      events = events.filter((e) => e.eventType === filter.eventType);
    }
    if (filter.published !== undefined) {
      events = events.filter((_, idx) =>
        filter.published ? this.#published.has(idx) : !this.#published.has(idx),
      );
    }
    return events;
  }

  /**
   * Test-surface helper only. The in-memory list is process-local and
   * single-threaded, so an index cannot race the way a database index can.
   * The Prisma writer exposes `markPublishedById` instead.
   */
  async markPublished(eventIndex: number): Promise<void> {
    if (eventIndex < 0 || eventIndex >= this.#events.length) {
      throw new Error(`Outbox event index ${eventIndex} out of range.`);
    }
    this.#published.add(eventIndex);
  }

  /**
   * Present for interface symmetry with the Prisma writer. The in-memory
   * store commits synchronously in the calling microtask, so there is no
   * transaction to enlist in; real atomicity is a Prisma concern.
   */
  async enqueueTransactional(event: OutboxEventRecord): Promise<void> {
    await this.enqueue(event);
  }
}
