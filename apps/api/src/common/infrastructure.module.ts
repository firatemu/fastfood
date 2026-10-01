import { Global, Module } from '@nestjs/common';

import { InMemoryAuditLogWriter } from './audit/audit.service.js';
import { PrismaAuditLogWriter } from './audit/prisma-audit-log.writer.js';
import { DatabaseModule } from './database/database.module.js';
import { OutboxConsumerService } from './outbox/outbox-consumer.service.js';
import { InMemoryOutboxWriter } from './outbox/outbox.service.js';
import { PrismaOutboxWriter } from './outbox/prisma-outbox.writer.js';

/**
 * Shared infrastructure module — Prisma-backed audit + outbox writers
 * for runtime persistence. In-memory writers remain available for
 * isolated unit tests that construct them directly.
 *
 * Marked `@Global()` so domain modules (cart/order/…) receive
 * `PrismaOutboxWriter` / `PrismaAuditLogWriter` without each importing
 * this module explicitly.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    PrismaAuditLogWriter,
    PrismaOutboxWriter,
    OutboxConsumerService,
    // Keep class tokens resolvable for tests that still import them.
    InMemoryAuditLogWriter,
    InMemoryOutboxWriter,
  ],
  exports: [PrismaAuditLogWriter, PrismaOutboxWriter, InMemoryAuditLogWriter, InMemoryOutboxWriter],
})
export class InfrastructureModule {}
