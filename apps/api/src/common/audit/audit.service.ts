import type { ActorType } from '@fastfood/domain-types';
import { Injectable, Logger } from '@nestjs/common';

/**
 * AuditLog writer (document 18 §8 + 31 §"AuditLog").
 *
 * Phase 3 ships an in-memory append-only writer. Persistence is
 * wired into the `audit_logs` table when the Session / Address /
 * User repositories land in a future work item; the writer
 * interface is already correct, so the migration is a one-line
 * repository swap.
 *
 * INVARIANT: the audit log is APPEND-ONLY. Updates and deletes
 * are NOT exposed at the application layer.
 */

export interface AuditLogEntry {
  readonly actorUserId: string | null;
  readonly actorType: ActorType | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly branchId: string | null;
  readonly requestId: string | null;
  readonly correlationId: string | null;
  readonly priorValues: Record<string, unknown> | null;
  readonly newValues: Record<string, unknown> | null;
  readonly reason: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface AuditLogWriter {
  append(entry: AuditLogEntry): Promise<void>;
  list(filter?: {
    resourceType?: string;
    actorUserId?: string;
    limit?: number;
  }): Promise<readonly AuditLogEntry[]>;
}

@Injectable()
export class InMemoryAuditLogWriter implements AuditLogWriter {
  readonly #entries: AuditLogEntry[] = [];
  readonly #logger = new Logger(InMemoryAuditLogWriter.name);

  async append(entry: AuditLogEntry): Promise<void> {
    this.#entries.push(entry);
    // Phase 3: also log to the structured logger so operators see the
    // audit events in the local console. Production deployment
    // writes the entry to the audit_logs table via the Prisma
    // repository.
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
    let entries = [...this.#entries];
    if (filter.resourceType) {
      entries = entries.filter((e) => e.resourceType === filter.resourceType);
    }
    if (filter.actorUserId) {
      entries = entries.filter((e) => e.actorUserId === filter.actorUserId);
    }
    const limit = filter.limit ?? entries.length;
    return entries.slice(-limit);
  }
}
