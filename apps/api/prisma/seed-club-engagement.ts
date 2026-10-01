import type { PrismaClient } from './generated/client/client.js';

const IDS = {
  tierKor: '01900000-0000-7000-c100-000000000001',
  tierAtes: '01900000-0000-7000-c100-000000000002',
  tierMaster: '01900000-0000-7000-c100-000000000003',
  welcomePromo: '01900000-0000-7000-c100-000000000010',
  spinCampaign: '01900000-0000-7000-c100-000000000020',
  prizePts100: '01900000-0000-7000-c100-000000000021',
  prizePct10: '01900000-0000-7000-c100-000000000022',
  prizeFreeDel: '01900000-0000-7000-c100-000000000023',
  prizePts25: '01900000-0000-7000-c100-000000000024',
  table12: '01900000-0000-7000-c100-000000000030',
  downtown: '01900000-0000-7000-8000-faaaaaaaaaaa',
};

export async function seedClubEngagement(prisma: PrismaClient): Promise<void> {
  await prisma.loyaltyTier.upsert({
    where: { id: IDS.tierKor },
    create: {
      id: IDS.tierKor,
      code: 'KOR',
      displayName: 'Kor',
      minLifetimeEarnedPoints: 0n,
      sortOrder: 0,
    },
    update: { displayName: 'Kor', minLifetimeEarnedPoints: 0n, sortOrder: 0, isActive: true },
  });
  await prisma.loyaltyTier.upsert({
    where: { id: IDS.tierAtes },
    create: {
      id: IDS.tierAtes,
      code: 'ATES',
      displayName: 'Ateş',
      minLifetimeEarnedPoints: 500n,
      sortOrder: 1,
    },
    update: { displayName: 'Ateş', minLifetimeEarnedPoints: 500n, sortOrder: 1, isActive: true },
  });
  await prisma.loyaltyTier.upsert({
    where: { id: IDS.tierMaster },
    create: {
      id: IDS.tierMaster,
      code: 'MASTER',
      displayName: 'Master',
      minLifetimeEarnedPoints: 2500n,
      sortOrder: 2,
    },
    update: { displayName: 'Master', minLifetimeEarnedPoints: 2500n, sortOrder: 2, isActive: true },
  });

  await prisma.promotion.upsert({
    where: { id: IDS.welcomePromo },
    create: {
      id: IDS.welcomePromo,
      code: 'BHCLUBWELCOME',
      name: 'BURGER HOME CLUB Hoş Geldin',
      kind: 'FIXED_CART_MINOR',
      discountMinor: 5000n,
      firstOrderOnly: true,
      usageLimitPerCustomer: 1,
      combinable: false,
      isActive: true,
    },
    update: {
      code: 'BHCLUBWELCOME',
      name: 'BURGER HOME CLUB Hoş Geldin',
      discountMinor: 5000n,
      firstOrderOnly: true,
      usageLimitPerCustomer: 1,
      isActive: true,
    },
  });

  await prisma.spinCampaign.upsert({
    where: { id: IDS.spinCampaign },
    create: {
      id: IDS.spinCampaign,
      code: 'ATES_CARKI',
      name: 'Ateş Çarkı',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2027-12-31T00:00:00.000Z'),
      isActive: true,
      dailySpinLimit: 1,
    },
    update: {
      name: 'Ateş Çarkı',
      isActive: true,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2027-12-31T00:00:00.000Z'),
    },
  });

  const prizes = [
    {
      id: IDS.prizePts100,
      code: 'PTS100',
      label: '100 BURGER HOME CLUB puan',
      kind: 'POINTS',
      weight: 50,
      pointsDelta: 100n,
      discountPercentBps: null as number | null,
      sortOrder: 0,
    },
    {
      id: IDS.prizePct10,
      code: 'PCT10',
      label: '%10 sepet indirimi',
      kind: 'PERCENT_CART',
      weight: 25,
      pointsDelta: null as bigint | null,
      discountPercentBps: 1000,
      sortOrder: 1,
    },
    {
      id: IDS.prizeFreeDel,
      code: 'FREEDEL',
      label: 'Ücretsiz teslimat',
      kind: 'DELIVERY_FEE_WAIVER',
      weight: 15,
      pointsDelta: null,
      discountPercentBps: null,
      sortOrder: 2,
    },
    {
      id: IDS.prizePts25,
      code: 'PTS25',
      label: '25 BURGER HOME CLUB puan',
      kind: 'POINTS',
      weight: 10,
      pointsDelta: 25n,
      discountPercentBps: null,
      sortOrder: 3,
    },
  ];
  for (const prize of prizes) {
    await prisma.spinPrize.upsert({
      where: { id: prize.id },
      create: {
        id: prize.id,
        campaignId: IDS.spinCampaign,
        code: prize.code,
        label: prize.label,
        kind: prize.kind,
        weight: prize.weight,
        pointsDelta: prize.pointsDelta,
        discountPercentBps: prize.discountPercentBps,
        sortOrder: prize.sortOrder,
      },
      update: {
        label: prize.label,
        weight: prize.weight,
        pointsDelta: prize.pointsDelta,
        discountPercentBps: prize.discountPercentBps,
        isActive: true,
      },
    });
  }

  await prisma.diningTable.upsert({
    where: { id: IDS.table12 },
    create: {
      id: IDS.table12,
      branchId: IDS.downtown,
      label: 'Masa 12',
      publicCode: 'bhx7k2m9q4wp',
      isActive: true,
    },
    update: { label: 'Masa 12', publicCode: 'bhx7k2m9q4wp', isActive: true },
  });
}
