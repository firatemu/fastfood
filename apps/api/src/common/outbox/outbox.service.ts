import { Injectable, Logger } from '@nestjs/common';

/**
 * Transactional outbox writer (document 17 §4 + 31 §"OutboxEvent").
 *
 * The application calls `enqueueOutboxEvent(...)` INSIDE the same
 * `prisma.$transaction([...])` call as the business mutation.
 * A separate worker (out of scope for Phase 3) drains the outbox
 * and dispatches the events to BullMQ / external providers.
 *
 * Phase 3 ships an in-memory writer for the test/contract surface.
 * The interface is stable so the production repository is a
 * one-line change.
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

export interface OutboxWriter {
  enqueue(event: OutboxEventRecord): Promise<void>;
  list(filter?: { eventType?: string; published?: boolean }): Promise<readonly OutboxEventRecord[]>;
  markPublished(eventIndex: number): Promise<void>;
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

  async markPublished(eventIndex: number): Promise<void> {
    if (eventIndex < 0 || eventIndex >= this.#events.length) {
      throw new Error(`Outbox event index ${eventIndex} out of range.`);
    }
    this.#published.add(eventIndex);
  }

  /**
   * Phase 3 transactional helper — the application calls this
   * inside its Prisma `$transaction` so the business mutation
   * and the OutboxEvent row commit atomically. The in-memory
   * implementation here does not need transactional isolation
   * (the events list is single-threaded), but the interface
   * preserves the production contract.
   */
  async enqueueTransactional(event: OutboxEventRecord): Promise<void> {
    await this.enqueue(event);
  }
}
