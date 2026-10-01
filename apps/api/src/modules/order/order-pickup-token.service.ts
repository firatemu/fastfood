import { createHash, randomBytes } from 'node:crypto';

import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

/**
 * Handles pickup-token issuance for the admin receipt flow and the
 * courier scan endpoint. The token is stored only as a SHA-256 hash; the
 * plaintext is rendered into the receipt QR + barcode.
 *
 * Behaviour is intentionally identical for the Prisma-backed and the
 * in-memory fallback paths so admin tests don't need a live database.
 */
const TOKEN_TTL_HOURS = 12;

export interface OrderPickupTokenRecord {
  id: string;
  orderId: string;
  tokenHash: string;
  tokenPrefix: string;
  expiresAt: Date;
  consumedAt: Date | null;
  consumedByCourierId: string | null;
  createdAt: Date;
}

@Injectable()
export class OrderPickupTokenService {
  readonly #tokens = new Map<string, OrderPickupTokenRecord>();
  readonly #byOrder = new Map<string, string>();
  #seq = 0;

  constructor(@Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null) {}

  /**
   * Issues a new pickup token for an order. The plaintext token is
   * returned only on creation; later requests return only the
   * truncated prefix for verification.
   */
  async issueForOrder(orderId: string): Promise<{ token: string; record: OrderPickupTokenRecord }> {
    if (!this.prisma) return this.#issueMemory(orderId);
    const existing = await this.prisma.orderPickupToken.findFirst({
      where: { orderId, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Bu sipariş için aktif bir pickup token zaten var.',
      });
    }
    const { token, hash, prefix } = generateToken();
    const record = await this.prisma.orderPickupToken.create({
      data: {
        orderId,
        tokenHash: hash,
        tokenPrefix: prefix,
        expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
    });
    return {
      token,
      record: {
        id: record.id,
        orderId: record.orderId,
        tokenHash: record.tokenHash,
        tokenPrefix: record.tokenPrefix,
        expiresAt: record.expiresAt,
        consumedAt: record.consumedAt,
        consumedByCourierId: record.consumedByCourierId,
        createdAt: record.createdAt,
      },
    };
  }

  async consumeByPrefix(
    prefix: string,
    courierId: string,
    now: Date = new Date(),
  ): Promise<OrderPickupTokenRecord> {
    if (!this.prisma) return this.#consumeMemory(prefix, courierId, now);
    const token = await this.prisma.orderPickupToken.findUnique({
      where: { tokenPrefix: prefix.toUpperCase() },
    });
    if (!token) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pickup token bulunamadı.',
      });
    }
    if (token.consumedAt) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Bu token daha önce kullanıldı.',
      });
    }
    if (token.expiresAt.getTime() < now.getTime()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Token süresi dolmuş.',
      });
    }
    return {
      id: token.id,
      orderId: token.orderId,
      tokenHash: token.tokenHash,
      tokenPrefix: token.tokenPrefix,
      expiresAt: token.expiresAt,
      consumedAt: now,
      consumedByCourierId: courierId,
      createdAt: token.createdAt,
    };
  }

  async findByOrder(orderId: string): Promise<OrderPickupTokenRecord | null> {
    if (!this.prisma) {
      const id = this.#byOrder.get(orderId);
      if (!id) return null;
      return this.#tokens.get(id) ?? null;
    }
    return this.prisma.orderPickupToken.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------- in-memory fallback ----------------------

  async #issueMemory(orderId: string): Promise<{ token: string; record: OrderPickupTokenRecord }> {
    const existing = this.findMemory(orderId);
    if (existing && !existing.consumedAt && existing.expiresAt.getTime() > Date.now()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Bu sipariş için aktif bir pickup token zaten var.',
      });
    }
    const { token, hash, prefix } = generateToken();
    const id = this.#newId();
    const now = new Date();
    const record: OrderPickupTokenRecord = {
      id,
      orderId,
      tokenHash: hash,
      tokenPrefix: prefix,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
      consumedAt: null,
      consumedByCourierId: null,
      createdAt: now,
    };
    this.#tokens.set(id, record);
    this.#byOrder.set(orderId, id);
    return { token, record };
  }

  #consumeMemory(prefix: string, courierId: string, now: Date): OrderPickupTokenRecord {
    const normalised = prefix.trim().toUpperCase();
    const record = [...this.#tokens.values()].find(
      (token) => token.tokenPrefix === normalised,
    );
    if (!record) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pickup token bulunamadı.',
      });
    }
    if (record.consumedAt) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Bu token daha önce kullanıldı.',
      });
    }
    if (record.expiresAt.getTime() < now.getTime()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Token süresi dolmuş.',
      });
    }
    const updated: OrderPickupTokenRecord = {
      ...record,
      consumedAt: now,
      consumedByCourierId: courierId,
    };
    this.#tokens.set(record.id, updated);
    return updated;
  }

  findMemory(orderId: string): OrderPickupTokenRecord | null {
    const id = this.#byOrder.get(orderId);
    if (!id) return null;
    return this.#tokens.get(id) ?? null;
  }

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-aaaa-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }
}

export function generateToken(): { token: string; hash: string; prefix: string } {
  const random = randomBytes(8).toString('hex').toUpperCase();
  const token = `PICKUP-${random}`;
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash, prefix: token };
}
