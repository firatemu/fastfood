import { Inject, Injectable, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

export interface AuditLogListItem {
  id: string;
  actorUserId: string | null;
  actorType: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  branchId: string | null;
  requestId: string | null;
  reason: string | null;
  createdAt: string;
}

@Injectable()
export class AuditQueryService {
  readonly #logs: AuditLogListItem[] = [];

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  async list(limit = 50, branchId?: string): Promise<AuditLogListItem[]> {
    if (!this.prisma) {
      return this.#logs.filter((row) => !branchId || row.branchId === branchId).slice(0, limit);
    }
    const scopedActorIds = branchId
      ? await this.prisma.userBranchScope.findMany({
          where: { branchId },
          select: { userId: true },
        })
      : [];
    const rows = await this.prisma.auditLog.findMany({
      where: branchId
        ? {
            OR: [
              { branchId },
              ...(scopedActorIds.length
                ? [{ actorUserId: { in: scopedActorIds.map((entry) => entry.userId) } }]
                : []),
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      actorUserId: r.actorUserId,
      actorType: r.actorType,
      action: r.action,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      branchId: r.branchId,
      requestId: r.requestId,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
