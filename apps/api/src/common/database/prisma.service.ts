import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../../prisma/generated/client/client.js';

/**
 * Single Prisma client wrapper. Phase 0 exposes the client directly so feature
 * modules can begin consuming it from day one. The wrapper establishes the
 * canonical connection (PostgreSQL 18 driver adapter) and centralizes the
 * lifecycle hooks so future transaction management has one obvious place to
 * extend.
 *
 * Document 35 §1 mandates Prisma 7 with PostgreSQL + PostGIS.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to construct the PrismaService.');
    }
    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('prisma client connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
