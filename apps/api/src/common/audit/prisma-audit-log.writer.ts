import type { ActorType } from '@fastfood/domain-types';
import { Inject, Injectable, Logger } from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuditLogEntry, AuditLogWriter } from './audit.service.js';

/**
 * Prisma-backed append-only AuditLog writer (document 18 §8).
 */
@Injectable()
export class PrismaAuditLogWriter implements AuditLogWriter {
  readonly #logger = new Logger(PrismaAuditLogWriter.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async append(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        actorType: entry.actorType as ActorType | null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        branchId: entry.branchId,
        requestId: entry.requestId,
        correlationId: entry.correlationId,
        priorValuesJson: (entry.priorValues ?? undefined) as Prisma.InputJsonValue | undefined,
        newValuesJson: (entry.newValues ?? undefined) as Prisma.InputJsonValue | undefined,
        reason: entry.reason,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
    this.#logger.log({
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      actorUserId: entry.actorUserId,
      requestId: entry.requestId,
    });
  }

  async list(
    filter: { resourceType?: string; actorUserId?: string; limit?: number } = {},
  ): Promise<readonly AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(filter.resourceType ? { resourceType: filter.resourceType } : {}),
        ...(filter.actorUserId ? { actorUserId: filter.actorUserId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      ...(filter.limit ? { take: filter.limit } : {}),
    });
    return rows.map((row) => ({
      actorUserId: row.actorUserId,
      actorType: (row.actorType as ActorType | null) ?? null,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      branchId: row.branchId,
      requestId: row.requestId,
      correlationId: row.correlationId,
      priorValues: (row.priorValuesJson as Record<string, unknown> | null) ?? null,
      newValues: (row.newValuesJson as Record<string, unknown> | null) ?? null,
      reason: row.reason,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    }));
  }
}
