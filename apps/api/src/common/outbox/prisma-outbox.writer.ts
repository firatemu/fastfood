import { Inject, Injectable, Logger } from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { PrismaService } from '../database/prisma.service.js';

import type { OutboxEventRecord, OutboxWriter } from './outbox.service.js';

/**
 * Prisma-backed transactional outbox writer (document 17 §4).
 */
@Injectable()
export class PrismaOutboxWriter implements OutboxWriter {
  readonly #logger = new Logger(PrismaOutboxWriter.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async enqueue(event: OutboxEventRecord): Promise<void> {
    await this.prisma.outboxEvent.create({
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
        ...(filter.published === false ? { publishedAt: null } : {}),
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

  async markPublished(eventIndex: number): Promise<void> {
    const unpublished = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const target = unpublished[eventIndex];
    if (!target) {
      throw new Error(`Outbox event index ${eventIndex} out of range.`);
    }
    await this.prisma.outboxEvent.update({
      where: { id: target.id },
      data: { publishedAt: new Date() },
    });
  }

  async enqueueTransactional(event: OutboxEventRecord): Promise<void> {
    await this.enqueue(event);
  }
}
