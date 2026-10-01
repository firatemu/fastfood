/**
 * Idempotency helper (document 09) — Prisma-backed at runtime.
 */
import { Inject, Injectable, Optional } from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { PrismaService } from '../database/prisma.service.js';

export interface IdempotencyHit {
  readonly response: unknown;
  readonly statusCode: number;
}

@Injectable()
export class IdempotencyService {
  readonly #records = new Map<string, IdempotencyHit & { requestHash?: string }>();

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #key(scope: string, idempotencyKey: string): string {
    return `${scope}::${idempotencyKey}`;
  }

  async lookup(scope: string, idempotencyKey: string): Promise<IdempotencyHit | null> {
    if (!this.prisma) {
      return this.#records.get(this.#key(scope, idempotencyKey)) ?? null;
    }
    const row = await this.prisma.idempotencyRecord.findUnique({
      where: { scope_idempotencyKey: { scope, idempotencyKey } },
    });
    if (!row || row.statusCode == null || row.responseJson == null) {
      return null;
    }
    return { response: row.responseJson, statusCode: row.statusCode };
  }

  async store(
    scope: string,
    idempotencyKey: string,
    hit: IdempotencyHit,
    requestHash?: string,
  ): Promise<void> {
    if (!this.prisma) {
      this.#records.set(this.#key(scope, idempotencyKey), { ...hit, requestHash });
      return;
    }
    await this.prisma.idempotencyRecord.upsert({
      where: { scope_idempotencyKey: { scope, idempotencyKey } },
      create: {
        scope,
        idempotencyKey,
        requestHash: requestHash ?? null,
        responseJson: hit.response as Prisma.InputJsonValue,
        statusCode: hit.statusCode,
      },
      update: {
        requestHash: requestHash ?? null,
        responseJson: hit.response as Prisma.InputJsonValue,
        statusCode: hit.statusCode,
      },
    });
  }
}
