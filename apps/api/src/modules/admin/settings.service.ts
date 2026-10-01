import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

export interface BusinessSettingDto {
  key: string;
  valueType: string;
  valueJson: unknown;
  category: string;
  description: string | null;
  mutable: boolean;
}

@Injectable()
export class SettingsService {
  readonly #settings = new Map<string, BusinessSettingDto>();

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {
    if (!this.prisma) {
      this.#settings.set('loyalty.points_per_try_minor', {
        key: 'loyalty.points_per_try_minor',
        valueType: 'number',
        valueJson: 100,
        category: 'loyalty',
        description: 'Points earned per 1 TRY merchandise (minor units basis)',
        mutable: true,
      });
    }
  }

  async list(): Promise<BusinessSettingDto[]> {
    if (!this.prisma) {
      return [...this.#settings.values()].sort((a, b) => a.key.localeCompare(b.key));
    }
    const rows = await this.prisma.businessSetting.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => ({
      key: r.key,
      valueType: r.valueType,
      valueJson: r.valueJson,
      category: r.category,
      description: r.description,
      mutable: r.mutable,
    }));
  }

  async patch(
    key: string,
    valueJson: unknown,
    updatedByUserId?: string,
  ): Promise<BusinessSettingDto> {
    if (!this.prisma) {
      const existing = this.#settings.get(key);
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Setting not found.',
        });
      }
      if (!existing.mutable) {
        throw new NotFoundException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Setting is not mutable.',
        });
      }
      const updated = { ...existing, valueJson };
      this.#settings.set(key, updated);
      return updated;
    }
    const row = await this.prisma.businessSetting.findUnique({ where: { key } });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Setting not found.',
      });
    }
    if (!row.mutable) {
      throw new NotFoundException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Setting is not mutable.',
      });
    }
    const updated = await this.prisma.businessSetting.update({
      where: { key },
      data: { valueJson: valueJson as object, updatedByUserId: updatedByUserId ?? null },
    });
    return {
      key: updated.key,
      valueType: updated.valueType,
      valueJson: updated.valueJson,
      category: updated.category,
      description: updated.description,
      mutable: updated.mutable,
    };
  }
}
