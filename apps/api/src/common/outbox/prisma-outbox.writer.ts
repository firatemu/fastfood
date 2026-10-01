import { Inject, Injectable, Logger } from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { PrismaService } from '../database/prisma.service.js';

import type {
  ClaimedOutboxEvent,
  OutboxClaimOptions,
  OutboxEventRecord,
  OutboxFailureState,
  OutboxWriter,
} from './outbox.service.js';

/**
 * A Prisma client or an open transaction client.
 *
 * `PrismaService` extends `PrismaClient`, so it already satisfies
 * `Prisma.TransactionClient`; one parameter type covers both cases.
 */
type OutboxClient = Prisma.TransactionClient;

interface OutboxClaimRow {
  id: string;
  eventType: string;
  eventVersion: number;
  aggregateType: string | null;
  aggregateId: string | null;
  payloadJson: Prisma.JsonValue;
  createdByUserId: string | null;
  createdAt: Date;
  attempts: number;
}

/**
 * Prisma-backed transactional outbox writer (document 17 §4).
 */
@Injectable()
export class PrismaOutboxWriter implements OutboxWriter {
  readonly #logger = new Logger(PrismaOutboxWriter.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Append one outbox row.
   *
   * Pass `client` from an open `prisma.$transaction(...)` callback so the
   * event commits atomically with the business mutation that produced it.
   * Omitting `client` writes the event on its own, which is only correct for
   * events that are not tied to a mutation.
   */
  async enqueue(event: OutboxEventRecord, client?: OutboxClient): Promise<void> {
    const db: OutboxClient = client ?? this.prisma;
    await db.outboxEvent.create({
      data: {
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payloadJson: event.payload as Prisma.InputJsonValue,
        createdByUserId: event.createdByUserId,
        createdAt: event.createdAt,
      },
    });
    this.#logger.log({
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
    });
  }

  async list(
    filter: { eventType?: string; published?: boolean } = {},
  ): Promise<readonly OutboxEventRecord[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: {
        ...(filter.eventType ? { eventType: filter.eventType } : {}),
        ...(filter.published === true ? { publishedAt: { not: null } } : {}),
        ...(filter.published === false ? { publishedAt: null, deadLetteredAt: null } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      eventVersion: row.eventVersion,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      payload: (row.payloadJson as Record<string, unknown>) ?? {},
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Lease a batch of unpublished events to one consumer.
   *
   * `FOR UPDATE SKIP LOCKED` is the canonical PostgreSQL queue pattern: the
   * inner select locks the candidate rows, and any row another consumer is
   * already holding is skipped instead of blocking. The outer update then
   * stamps the lease and increments `attempts`.
   *
   * A row is eligible when it is unpublished, not dead-lettered, past its
   * backoff, and either unleased or holding an expired lease. That last case is
   * what recovers events abandoned by a consumer that died mid-dispatch.
   */
  async claimBatch(options: OutboxClaimOptions): Promise<readonly ClaimedOutboxEvent[]> {
    const now = options.now ?? new Date();
    const leaseCutoff = new Date(now.getTime() - options.leaseMs);
    const rows = await this.prisma.$queryRaw<OutboxClaimRow[]>`
      UPDATE "outbox_events" AS o
         SET "locked_at" = ${now},
             "locked_by" = ${options.ownerId},
             "attempts" = o."attempts" + 1,
             "last_attempt_at" = ${now}
       WHERE o."id" IN (
         SELECT "id"
           FROM "outbox_events"
          WHERE "published_at" IS NULL
            AND "dead_lettered_at" IS NULL
            AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= ${now})
            AND ("locked_at" IS NULL OR "locked_at" < ${leaseCutoff})
          ORDER BY "created_at" ASC
          LIMIT ${options.limit}
            FOR UPDATE SKIP LOCKED
       )
      RETURNING
        o."id",
        o."event_type"        AS "eventType",
        o."event_version"     AS "eventVersion",
        o."aggregate_type"    AS "aggregateType",
        o."aggregate_id"      AS "aggregateId",
        o."payload_json"      AS "payloadJson",
        o."created_by_user_id" AS "createdByUserId",
        o."created_at"        AS "createdAt",
        o."attempts"          AS "attempts"
    `;
    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      eventVersion: row.eventVersion,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      payload: (row.payloadJson as Record<string, unknown>) ?? {},
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      attempts: row.attempts,
    }));
  }

  /**
   * Mark one event as delivered and release its lease.
   *
   * Addressing by id (never by list position) is what makes concurrent
   * consumers safe. Returns `false` when the row is gone, already published,
   * or the lease moved to another owner — the caller must then discard the
   * result it produced rather than assume success.
   */
  async markPublishedById(id: string, ownerId: string, now = new Date()): Promise<boolean> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id, publishedAt: null, lockedBy: ownerId },
      data: { publishedAt: now, lockedAt: null, lockedBy: null, lastError: null },
    });
    return result.count > 0;
  }

  /**
   * Record a failed delivery: store the error, schedule the next attempt and
   * release the lease. `deadLetteredAt` stops further claiming once the retry
   * budget is spent, so a poison event cannot spin forever.
   */
  async markFailedById(
    id: string,
    ownerId: string,
    error: string,
    state: OutboxFailureState,
  ): Promise<boolean> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id, publishedAt: null, lockedBy: ownerId },
      data: {
        lastError: error.slice(0, 2048),
        nextAttemptAt: state.nextAttemptAt,
        deadLetteredAt: state.deadLetteredAt,
        lockedAt: null,
        lockedBy: null,
      },
    });
    return result.count > 0;
  }
}
