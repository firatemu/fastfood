import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

export type StorefrontContentKind = 'STORY' | 'LEGAL' | 'ALLERGEN_DISCLAIMER' | 'COMPANY';

export interface ContentSectionDto {
  id: string;
  heading: string;
  body: string;
}

export interface StorefrontContentDto {
  slug: string;
  kind: StorefrontContentKind;
  title: string;
  body: string;
  sections: ContentSectionDto[];
  effectiveAt: string | null;
  displayOrder: number;
}

export interface SeedContentInput {
  slug: string;
  kind: StorefrontContentKind;
  title: string;
  body: string;
  sections?: ContentSectionDto[];
  effectiveAt?: Date | null;
  isPublished: boolean;
  displayOrder: number;
}

@Injectable()
export class StorefrontContentService {
  private readonly memory = new Map<string, SeedContentInput>();

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  seedMemory(rows: SeedContentInput[]): void {
    this.memory.clear();
    for (const row of rows) this.memory.set(row.slug, row);
  }

  async listPublished(kind?: string): Promise<StorefrontContentDto[]> {
    if (!this.prisma) {
      return [...this.memory.values()]
        .filter((row) => row.isPublished && (kind === undefined || row.kind === kind))
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((row) => this.toDto(row));
    }
    const rows = await this.prisma.storefrontContentDocument.findMany({
      where: { isPublished: true, ...(kind ? { kind } : {}) },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async getPublished(slug: string): Promise<StorefrontContentDto> {
    if (!this.prisma) {
      const row = this.memory.get(slug);
      if (!row?.isPublished) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Content not found.',
        });
      }
      return this.toDto(row);
    }
    const row = await this.prisma.storefrontContentDocument.findFirst({
      where: { slug, isPublished: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Content not found.',
      });
    }
    return this.toDto(row);
  }

  private toDto(row: {
    slug: string;
    kind: string;
    title: string;
    body: string;
    sectionsJson?: unknown;
    sections?: ContentSectionDto[];
    effectiveAt?: Date | string | null;
    displayOrder: number;
  }): StorefrontContentDto {
    const sections = Array.isArray(row.sections)
      ? row.sections
      : Array.isArray(row.sectionsJson)
        ? (row.sectionsJson as ContentSectionDto[])
        : [];
    const effective =
      row.effectiveAt instanceof Date
        ? row.effectiveAt.toISOString()
        : typeof row.effectiveAt === 'string'
          ? row.effectiveAt
          : null;
    return {
      slug: row.slug,
      kind: row.kind as StorefrontContentKind,
      title: row.title,
      body: row.body,
      sections,
      effectiveAt: effective,
      displayOrder: row.displayOrder,
    };
  }
}
