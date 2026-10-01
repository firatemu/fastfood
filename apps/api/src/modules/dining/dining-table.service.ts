import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

export interface DiningTableContext {
  publicCode: string;
  label: string;
  branchId: string;
  branchName: string;
  isActive: boolean;
}

const DEV_TABLE: DiningTableContext = {
  publicCode: 'bhx7k2m9q4wp',
  label: 'Masa 12',
  branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
  branchName: 'Kadıköy',
  isActive: true,
};

@Injectable()
export class DiningTableService {
  readonly #tables = new Map<string, DiningTableContext>([[DEV_TABLE.publicCode, DEV_TABLE]]);

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  seedMemoryTable(table: DiningTableContext): void {
    this.#tables.set(table.publicCode, table);
  }

  async resolve(publicCode: string): Promise<DiningTableContext> {
    const code = publicCode.trim();
    if (!this.prisma) {
      const table = this.#tables.get(code);
      if (!table) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Table code is invalid.',
        });
      }
      if (!table.isActive) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Table is not available.',
        });
      }
      return table;
    }
    const row = await this.prisma.diningTable.findUnique({
      where: { publicCode: code },
      include: { branch: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Table code is invalid.',
      });
    }
    if (!row.isActive || !row.branch.isActive) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Table is not available.',
      });
    }
    return {
      publicCode: row.publicCode,
      label: row.label,
      branchId: row.branchId,
      branchName: row.branch.name,
      isActive: true,
    };
  }

  async recordScan(input: {
    publicCode: string;
    userId?: string | null;
    guestSessionId?: string | null;
  }): Promise<DiningTableContext> {
    const table = await this.resolve(input.publicCode);
    if (this.prisma) {
      const row = await this.prisma.diningTable.findUnique({
        where: { publicCode: table.publicCode },
      });
      if (row) {
        await this.prisma.diningTableScan.create({
          data: {
            tableId: row.id,
            userId: input.userId ?? null,
            guestSessionId: input.guestSessionId ?? null,
          },
        });
      }
    }
    return table;
  }
}
