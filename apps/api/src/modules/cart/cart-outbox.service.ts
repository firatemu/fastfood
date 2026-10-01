import { Inject, Injectable, Optional } from '@nestjs/common';

import { InMemoryOutboxWriter, type OutboxWriter } from '../../common/outbox/outbox.service.js';
import { PrismaOutboxWriter } from '../../common/outbox/prisma-outbox.writer.js';

/**
 * Cart outbox emission — uses PrismaOutboxWriter at runtime.
 */
@Injectable()
export class CartOutboxService {
  readonly writer: OutboxWriter;

  constructor(
    @Optional() @Inject(PrismaOutboxWriter) prismaWriter: PrismaOutboxWriter | null = null,
  ) {
    this.writer = prismaWriter ?? new InMemoryOutboxWriter();
  }

  async enqueueLineAdded(input: {
    cartId: string;
    userId: string | null;
    guestSessionId: string | null;
    lineId: string;
    productId: string;
    quantity: number;
    unitPriceMinor: bigint;
  }): Promise<void> {
    await this.writer.enqueue({
      eventType: 'CartLineAdded',
      eventVersion: 1,
      aggregateType: 'cart',
      aggregateId: input.cartId,
      payload: {
        cartId: input.cartId,
        userId: input.userId,
        guestSessionId: input.guestSessionId,
        lineId: input.lineId,
        productId: input.productId,
        quantity: input.quantity,
        unitPriceMinor: input.unitPriceMinor.toString(),
      },
      createdByUserId: null,
      createdAt: new Date(),
    });
  }

  async enqueueLineUpdated(input: {
    cartId: string;
    userId: string | null;
    guestSessionId: string | null;
    lineId: string;
    productId: string;
    quantity: number;
    unitPriceMinor: bigint;
  }): Promise<void> {
    await this.writer.enqueue({
      eventType: 'CartLineUpdated',
      eventVersion: 1,
      aggregateType: 'cart',
      aggregateId: input.cartId,
      payload: {
        cartId: input.cartId,
        userId: input.userId,
        guestSessionId: input.guestSessionId,
        lineId: input.lineId,
        productId: input.productId,
        quantity: input.quantity,
        unitPriceMinor: input.unitPriceMinor.toString(),
      },
      createdByUserId: null,
      createdAt: new Date(),
    });
  }

  async enqueueLineRemoved(input: {
    cartId: string;
    userId: string | null;
    guestSessionId: string | null;
    lineId: string;
  }): Promise<void> {
    await this.writer.enqueue({
      eventType: 'CartLineRemoved',
      eventVersion: 1,
      aggregateType: 'cart',
      aggregateId: input.cartId,
      payload: {
        cartId: input.cartId,
        userId: input.userId,
        guestSessionId: input.guestSessionId,
        lineId: input.lineId,
      },
      createdByUserId: null,
      createdAt: new Date(),
    });
  }

  list(filter?: { eventType?: string; published?: boolean }): ReturnType<OutboxWriter['list']> {
    return this.writer.list(filter);
  }
}
