/**
 * Loyalty reservation service — Prisma-backed ledger + reservations.
 */
import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

import { LIFETIME_EXCLUDE_TYPES } from './club.config.js';

export interface LoyaltyActivityItem {
  id: string;
  entryType: string;
  pointsDelta: string;
  reason: string | null;
  createdAt: string;
}

export interface LoyaltyReservationDto {
  id: string;
  userId: string;
  checkoutSessionId: string | null;
  pointsReserved: bigint;
  valueMinor: bigint;
  status: 'ACTIVE' | 'RELEASED' | 'CONSUMED' | 'EXPIRED';
  createdAt: Date;
  expiresAt: Date | null;
}

@Injectable()
export class LoyaltyService {
  readonly #reservations = new Map<string, LoyaltyReservationDto>();
  readonly #balances = new Map<string, bigint>();
  readonly #ledger: Array<{
    id: string;
    userId: string;
    entryType: string;
    pointsDelta: bigint;
    reason: string | null;
    createdAt: Date;
  }> = [];
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-9000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  async credit(input: {
    userId: string;
    points: bigint;
    reason: string;
    entryType?: string;
  }): Promise<void> {
    if (input.points <= 0n) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'points must be positive.',
      });
    }
    if (!this.prisma) {
      this.#balances.set(input.userId, (await this.getBalance(input.userId)) + input.points);
      this.#ledger.push({
        id: this.#newId(),
        userId: input.userId,
        entryType: input.entryType ?? 'CREDIT',
        pointsDelta: input.points,
        reason: input.reason,
        createdAt: new Date(),
      });
      return;
    }
    await this.prisma.loyaltyLedgerEntry.create({
      data: {
        userId: input.userId,
        entryType: input.entryType ?? 'CREDIT',
        pointsDelta: input.points,
        valueMinorDelta: 0n,
        reason: input.reason,
      },
    });
  }

  async getLifetimeEarned(userId: string): Promise<bigint> {
    const rows = this.prisma
      ? await this.prisma.loyaltyLedgerEntry.findMany({
          where: { userId },
          select: { pointsDelta: true, entryType: true },
        })
      : this.#ledger.filter((row) => row.userId === userId);
    return rows.reduce((sum, row) => {
      if (row.pointsDelta <= 0n) return sum;
      if (LIFETIME_EXCLUDE_TYPES.has(row.entryType)) return sum;
      return sum + row.pointsDelta;
    }, 0n);
  }

  async listCustomerActivity(userId: string, limit = 20): Promise<LoyaltyActivityItem[]> {
    const rows = this.prisma
      ? await this.prisma.loyaltyLedgerEntry.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
      : [...this.#ledger]
          .filter((row) => row.userId === userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit);
    return rows.map((row) => ({
      id: row.id,
      entryType: this.customerSafeEntryType(row.entryType),
      pointsDelta: row.pointsDelta.toString(),
      reason: this.customerSafeReason(row.reason),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private customerSafeEntryType(entryType: string): string {
    if (entryType === 'RESERVE' || entryType === 'REDEMPTION_RESERVED') return 'REDEEMED';
    if (entryType === 'RELEASE' || entryType === 'REDEMPTION_RESTORED') return 'RESTORED';
    if (entryType === 'CREDIT' || entryType === 'EARN' || entryType === 'EARN_CONFIRMED') {
      return 'EARNED';
    }
    if (entryType === 'ADJUST' || entryType === 'ADJUSTMENT_CREDIT' || entryType === 'ADJUSTMENT_DEBIT') {
      return 'ADJUSTMENT';
    }
    return 'ACTIVITY';
  }

  private customerSafeReason(reason: string | null): string | null {
    if (!reason) return null;
    if (reason === 'welcome_reward') return 'welcome_reward';
    if (reason === 'spin_reward') return 'spin_reward';
    if (reason === 'order_earn') return 'order_earn';
    if (reason === 'checkout_reserve') return 'redeemed';
    if (reason === 'checkout_release') return 'released';
    if (reason === 'set_balance') return 'adjustment';
    return 'activity';
  }

  async setBalance(userId: string, points: bigint): Promise<void> {
    if (!this.prisma) {
      const current = this.#balances.get(userId) ?? 0n;
      const delta = points - current;
      this.#balances.set(userId, points);
      if (delta !== 0n) {
        this.#ledger.push({
          id: this.#newId(),
          userId,
          entryType: delta > 0n ? 'CREDIT' : 'ADJUST',
          pointsDelta: delta,
          reason: 'set_balance',
          createdAt: new Date(),
        });
      }
      return;
    }
    const current = await this.getBalance(userId);
    const delta = points - current;
    if (delta === 0n) return;
    await this.prisma.loyaltyLedgerEntry.create({
      data: {
        userId,
        entryType: delta > 0n ? 'CREDIT' : 'ADJUST',
        pointsDelta: delta,
        valueMinorDelta: 0n,
        reason: 'set_balance',
      },
    });
  }

  async getBalance(userId: string): Promise<bigint> {
    if (!this.prisma) {
      return this.#balances.get(userId) ?? 0n;
    }
    const rows = await this.prisma.loyaltyLedgerEntry.findMany({
      where: { userId },
      select: { pointsDelta: true },
    });
    return rows.reduce((sum, r) => sum + r.pointsDelta, 0n);
  }

  async reserve(input: {
    userId: string;
    points: bigint;
    pointValueMinor?: bigint;
    checkoutSessionId?: string;
  }): Promise<LoyaltyReservationDto> {
    if (input.points <= 0n) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'points must be positive.',
      });
    }
    const balance = await this.getBalance(input.userId);
    if (input.points > balance) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Insufficient loyalty points.',
        details: { available: balance.toString(), requested: input.points.toString() },
      });
    }
    const pointValue = input.pointValueMinor ?? 1n;
    if (!this.prisma) {
      const reservation: LoyaltyReservationDto = {
        id: this.#newId(),
        userId: input.userId,
        checkoutSessionId: input.checkoutSessionId ?? null,
        pointsReserved: input.points,
        valueMinor: input.points * pointValue,
        status: 'ACTIVE',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
      this.#reservations.set(reservation.id, reservation);
      this.#balances.set(input.userId, balance - input.points);
      return reservation;
    }
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const reservation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.loyaltyReservation.create({
        data: {
          userId: input.userId,
          checkoutSessionId: input.checkoutSessionId ?? null,
          pointsReserved: input.points,
          valueMinor: input.points * pointValue,
          status: 'ACTIVE',
          expiresAt,
        },
      });
      await tx.loyaltyLedgerEntry.create({
        data: {
          userId: input.userId,
          entryType: 'RESERVE',
          pointsDelta: -input.points,
          valueMinorDelta: -(input.points * pointValue),
          reservationId: created.id,
          reason: 'checkout_reserve',
        },
      });
      return created;
    });
    return {
      id: reservation.id,
      userId: reservation.userId,
      checkoutSessionId: reservation.checkoutSessionId,
      pointsReserved: reservation.pointsReserved,
      valueMinor: reservation.valueMinor,
      status: reservation.status as LoyaltyReservationDto['status'],
      createdAt: reservation.createdAt,
      expiresAt: reservation.expiresAt,
    };
  }

  async release(reservationId: string, userId: string): Promise<LoyaltyReservationDto> {
    if (!this.prisma) {
      const reservation = this.#reservations.get(reservationId);
      if (!reservation || reservation.userId !== userId) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Loyalty reservation not found.',
        });
      }
      if (reservation.status !== 'ACTIVE') {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: `Reservation is ${reservation.status}.`,
        });
      }
      reservation.status = 'RELEASED';
      this.#balances.set(userId, (await this.getBalance(userId)) + reservation.pointsReserved);
      return reservation;
    }
    const reservation = await this.prisma.loyaltyReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation || reservation.userId !== userId) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Loyalty reservation not found.',
      });
    }
    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Reservation is ${reservation.status}.`,
      });
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.loyaltyReservation.update({
        where: { id: reservationId },
        data: { status: 'RELEASED' },
      });
      await tx.loyaltyLedgerEntry.create({
        data: {
          userId,
          entryType: 'RELEASE',
          pointsDelta: reservation.pointsReserved,
          valueMinorDelta: reservation.valueMinor,
          reservationId,
          reason: 'checkout_release',
        },
      });
      return row;
    });
    return {
      id: updated.id,
      userId: updated.userId,
      checkoutSessionId: updated.checkoutSessionId,
      pointsReserved: updated.pointsReserved,
      valueMinor: updated.valueMinor,
      status: updated.status as LoyaltyReservationDto['status'],
      createdAt: updated.createdAt,
      expiresAt: updated.expiresAt,
    };
  }

  async getReservation(reservationId: string): Promise<LoyaltyReservationDto> {
    if (!this.prisma) {
      const reservation = this.#reservations.get(reservationId);
      if (!reservation) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Loyalty reservation not found.',
        });
      }
      return reservation;
    }
    const reservation = await this.prisma.loyaltyReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Loyalty reservation not found.',
      });
    }
    return {
      id: reservation.id,
      userId: reservation.userId,
      checkoutSessionId: reservation.checkoutSessionId,
      pointsReserved: reservation.pointsReserved,
      valueMinor: reservation.valueMinor,
      status: reservation.status as LoyaltyReservationDto['status'],
      createdAt: reservation.createdAt,
      expiresAt: reservation.expiresAt,
    };
  }
}
