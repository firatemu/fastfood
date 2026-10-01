import { Inject, Injectable, Optional } from '@nestjs/common';

import { InMemoryOutboxWriter, type OutboxWriter } from '../../common/outbox/outbox.service.js';
import { PrismaOutboxWriter } from '../../common/outbox/prisma-outbox.writer.js';

/**
 * Order outbox emission — uses PrismaOutboxWriter at runtime.
 */
@Injectable()
export class OrderOutboxService {
  readonly writer: OutboxWriter;

  constructor(
    @Optional() @Inject(PrismaOutboxWriter) prismaWriter: PrismaOutboxWriter | null = null,
  ) {
    this.writer = prismaWriter ?? new InMemoryOutboxWriter();
  }

  async enqueueStatusChanged(input: {
    orderId: string;
    fromStatus: string;
    toStatus: string;
    actorUserId: string | null;
  }): Promise<void> {
    await this.writer.enqueue({
      eventType: 'OrderStatusChanged',
      eventVersion: 1,
      aggregateType: 'order',
      aggregateId: input.orderId,
      payload: {
        orderId: input.orderId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorUserId: input.actorUserId,
      },
      createdByUserId: null,
      createdAt: new Date(),
    });
  }

  async enqueueBranchAssigned(input: {
    orderId: string;
    branchId: string;
    previousBranchId: string | null;
    reason: string | null;
    actorUserId: string | null;
  }): Promise<void> {
    await this.writer.enqueue({
      eventType: 'OrderBranchAssigned',
      eventVersion: 1,
      aggregateType: 'order',
      aggregateId: input.orderId,
      payload: {
        orderId: input.orderId,
        branchId: input.branchId,
        previousBranchId: input.previousBranchId,
        reason: input.reason,
      },
      createdByUserId: null,
      createdAt: new Date(),
    });
  }

  list(filter?: { eventType?: string; published?: boolean }): ReturnType<OutboxWriter['list']> {
    return this.writer.list(filter);
  }
}
