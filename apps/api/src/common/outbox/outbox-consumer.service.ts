import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import { getAppConfig } from '../../bootstrap/app-config.js';

import type { ClaimedOutboxEvent } from './outbox.service.js';
import { PrismaOutboxWriter } from './prisma-outbox.writer.js';

/**
 * Handler for one outbox event type.
 *
 * Handlers MUST be idempotent (document 32 §3). A lease can expire while a
 * handler is still running, letting a second consumer take the same row, so
 * delivery is at-least-once and the handler, not the consumer, is the place
 * that has to tolerate a repeat.
 */
export type OutboxEventHandler = (event: ClaimedOutboxEvent) => Promise<void>;

/**
 * Durable outbox consumer (document 17 §4).
 *
 * Polls `outbox_events`, leases a batch, dispatches each row to a registered
 * handler and records the outcome. The lease, retry backoff and dead-letter
 * bookkeeping all live in the database rather than in this process, so a
 * consumer that is killed mid-batch loses nothing: the rows stay unpublished
 * and their leases expire, after which any consumer can recover them.
 */
@Injectable()
export class OutboxConsumerService implements OnModuleInit, OnModuleDestroy {
  readonly #logger = new Logger(OutboxConsumerService.name);
  readonly #handlers = new Map<string, OutboxEventHandler>();

  /** Identifies this process in `locked_by`, so a stale lease is attributable. */
  readonly #ownerId = `api-${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;

  #timer: NodeJS.Timeout | undefined;
  #stopped = false;
  #ticking = false;

  constructor(@Inject(PrismaOutboxWriter) private readonly writer: PrismaOutboxWriter) {
    for (const eventType of OutboxConsumerService.KNOWN_EVENT_TYPES) {
      this.registerHandler(eventType, async (event) => {
        // The business side effects these events describe are not implemented
        // yet; the customer-facing notification still happens inline in
        // OrderService. Recording the delivery here is deliberate: the row is
        // genuinely consumed and stops blocking the dispatch index, and the
        // event is preserved in the table as history.
        this.#logger.log({
          eventType: event.eventType,
          eventId: event.id,
          aggregateId: event.aggregateId,
          attempt: event.attempts,
          payload: event.payload,
          note: 'no side effect attached yet',
        });
      });
    }
  }

  /** Event types the API currently emits. A row outside this set is not dropped silently. */
  static readonly KNOWN_EVENT_TYPES: readonly string[] = [
    'OrderStatusChanged',
    'OrderBranchAssigned',
    'CartLineAdded',
    'CartLineRemoved',
  ];

  registerHandler(eventType: string, handler: OutboxEventHandler): void {
    this.#handlers.set(eventType, handler);
  }

  onModuleInit(): void {
    const env = getAppConfig();
    if (!env.OUTBOX_CONSUMER_ENABLED) {
      this.#logger.log('outbox consumer disabled by configuration');
      return;
    }
    if (env.NODE_ENV === 'test') {
      this.#logger.log('outbox consumer disabled under NODE_ENV=test');
      return;
    }
    this.#schedule(env.OUTBOX_CONSUMER_POLL_INTERVAL_MS);
    this.#logger.log({
      ownerId: this.#ownerId,
      pollIntervalMs: env.OUTBOX_CONSUMER_POLL_INTERVAL_MS,
      batchSize: env.OUTBOX_CONSUMER_BATCH_SIZE,
    });
  }

  onModuleDestroy(): void {
    this.#stopped = true;
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }

  /**
   * Chain the next poll after the current one finishes. A plain `setInterval`
   * would let a slow batch overlap itself, and the in-flight guard would then
   * silently drop ticks.
   */
  #schedule(intervalMs: number): void {
    if (this.#stopped) return;
    this.#timer = setTimeout(() => {
      void this.tick()
        .catch((error: unknown) => {
          this.#logger.error({ err: error }, 'outbox consumer tick failed');
        })
        .finally(() => {
          this.#schedule(intervalMs);
        });
    }, intervalMs);
    // Never hold the event loop open just for the next poll.
    this.#timer.unref?.();
  }

  /**
   * Claim and process one batch. Returns the number of rows handled.
   *
   * Public and clock-injectable so a test can drive it deterministically.
   */
  async tick(now = new Date()): Promise<number> {
    if (this.#ticking) return 0;
    this.#ticking = true;
    try {
      const env = getAppConfig();
      const claimed = await this.writer.claimBatch({
        limit: env.OUTBOX_CONSUMER_BATCH_SIZE,
        leaseMs: env.OUTBOX_CONSUMER_LEASE_MS,
        ownerId: this.#ownerId,
        now,
      });
      for (const event of claimed) {
        await this.#dispatch(event, now);
      }
      return claimed.length;
    } finally {
      this.#ticking = false;
    }
  }

  async #dispatch(event: ClaimedOutboxEvent, now: Date): Promise<void> {
    const handler = this.#handlers.get(event.eventType);
    if (!handler) {
      // An unrecognised event type is a defect, not a no-op. Failing here keeps
      // the row claimed-and-retried instead of quietly discarding a message
      // this process does not understand yet.
      this.#logger.error(
        {
          eventType: event.eventType,
          eventId: event.id,
          attempt: event.attempts,
        },
        'no handler registered for outbox event type',
      );
      await this.#recordFailure(
        event,
        new Error(`No handler for event type ${event.eventType}`),
        now,
      );
      return;
    }

    try {
      await handler(event);
      const published = await this.writer.markPublishedById(event.id, this.#ownerId, now);
      if (!published) {
        // The lease was lost or the row was already completed elsewhere. The
        // work may have been done twice, which is why handlers must be
        // idempotent; there is nothing to record.
        this.#logger.warn(
          { eventId: event.id },
          'outbox lease lost before completion was recorded',
        );
      }
    } catch (error: unknown) {
      await this.#recordFailure(event, error, now);
    }
  }

  async #recordFailure(event: ClaimedOutboxEvent, error: unknown, now: Date): Promise<void> {
    const env = getAppConfig();
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = event.attempts >= env.OUTBOX_CONSUMER_MAX_ATTEMPTS;
    const backoffMs = Math.min(
      env.OUTBOX_CONSUMER_BACKOFF_BASE_MS * 2 ** Math.max(0, event.attempts - 1),
      env.OUTBOX_CONSUMER_BACKOFF_MAX_MS,
    );
    const nextAttemptAt = exhausted ? null : new Date(now.getTime() + backoffMs);

    if (exhausted) {
      this.#logger.error(
        { eventId: event.id, eventType: event.eventType, attempts: event.attempts, err: message },
        'outbox event dead-lettered after exhausting its retry budget',
      );
    } else {
      this.#logger.warn(
        {
          eventId: event.id,
          eventType: event.eventType,
          attempt: event.attempts,
          backoffMs,
          err: message,
        },
        'outbox event delivery failed; scheduled for retry',
      );
    }

    await this.writer.markFailedById(event.id, this.#ownerId, message, {
      nextAttemptAt,
      deadLetteredAt: exhausted ? now : null,
    });
  }
}
