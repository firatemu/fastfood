// Audit P0-5 — the loyalty balance must be read and written under one
// customer lock, otherwise two concurrent checkouts spend the same points.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/common/database/prisma.service.js';
import { InfrastructureModule } from '../../src/common/infrastructure.module.js';
import { LoyaltyModule } from '../../src/modules/loyalty/loyalty.module.js';
import { LoyaltyService } from '../../src/modules/loyalty/loyalty.service.js';

const USER_ID = '01900000-0000-7000-9000-0000000000a1';
const POINTS_PER_RESERVATION = 40n;
const BALANCE = 100n;
const CONCURRENCY = 8;

describe('audit P0-5 — loyalty balance locking (database)', () => {
  let app: NestFastifyApplication | undefined;
  let db: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [InfrastructureModule, LoyaltyModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    app.setGlobalPrefix('/api/v1');
    await app.init();
    (await app.getHttpAdapter()).getInstance().ready();

    db = app.get(PrismaService);
    await db.loyaltyLedgerEntry.deleteMany({ where: { userId: USER_ID } });
    await db.loyaltyReservation.deleteMany({ where: { userId: USER_ID } });
    await db.user.deleteMany({ where: { id: USER_ID } });
    await db.user.create({
      data: {
        id: USER_ID,
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        primaryIdentifier: `loyalty-lock-${Date.now()}@example.com`,
        primaryIdentifierType: 'EMAIL',
        displayName: 'Loyalty Lock User',
      },
    });
  });

  afterAll(async () => {
    if (!db) return;
    await db.loyaltyLedgerEntry.deleteMany({ where: { userId: USER_ID } });
    await db.loyaltyReservation.deleteMany({ where: { userId: USER_ID } });
    await db.user.deleteMany({ where: { id: USER_ID } });
    if (app) await app.close();
  });

  it('never lets concurrent reservations spend the same points', async () => {
    if (!app) throw new Error('app not initialized');
    const loyalty = app.get(LoyaltyService);
    await loyalty.setBalance(USER_ID, BALANCE);

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () =>
        loyalty.reserve({ userId: USER_ID, points: POINTS_PER_RESERVATION }),
      ),
    );

    const granted = results.filter((r) => r.status === 'fulfilled').length;
    const rejected = results.filter((r) => r.status === 'rejected').length;

    // The balance only allows two reservations of 40 points.
    expect(granted).toBe(2);
    expect(rejected).toBe(CONCURRENCY - 2);

    // The balance is never over-spent.
    const balance = await loyalty.getBalance(USER_ID);
    expect(balance).toBe(BALANCE - BigInt(granted) * POINTS_PER_RESERVATION);
    expect(balance).toBeGreaterThanOrEqual(0n);
  });

  it('rejects a reservation above the remaining balance', async () => {
    if (!app) throw new Error('app not initialized');
    const loyalty = app.get(LoyaltyService);
    const balance = await loyalty.getBalance(USER_ID);
    await expect(loyalty.reserve({ userId: USER_ID, points: balance + 1n })).rejects.toThrow(
      /Insufficient loyalty points/,
    );
  });

  it('restores the reserved points on release', async () => {
    if (!app) throw new Error('app not initialized');
    const loyalty = app.get(LoyaltyService);
    const before = await loyalty.getBalance(USER_ID);
    const reservation = await loyalty.reserve({ userId: USER_ID, points: 10n });
    expect(await loyalty.getBalance(USER_ID)).toBe(before - 10n);
    await loyalty.release(reservation.id, USER_ID);
    expect(await loyalty.getBalance(USER_ID)).toBe(before);
  });

  it('refuses a release that belongs to another customer', async () => {
    if (!app) throw new Error('app not initialized');
    const loyalty = app.get(LoyaltyService);
    const reservation = await loyalty.reserve({ userId: USER_ID, points: 10n });
    const otherUserId = '01900000-0000-7000-9000-0000000000b2';
    await expect(loyalty.release(reservation.id, otherUserId)).rejects.toThrow(
      /Loyalty reservation not found/,
    );
    await loyalty.release(reservation.id, USER_ID);
  });
});
