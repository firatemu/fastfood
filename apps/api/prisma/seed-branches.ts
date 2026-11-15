import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/client/client.js';

type BranchSeedData = {
  id: string;
  code: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  isActive: boolean;
  isAcceptingOrders: boolean;
  minOrderMinor: number;
  deliveryFeeMinor: number;
  estimatedDeliveryMinutesMin: number;
  estimatedDeliveryMinutesMax: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
};

type PinPoint = { lat: number; lng: number };

export const DEFAULT_SERVICE_RADIUS_KM = 2.0;
export const DEFAULT_PIN_CORNERS = 6;

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Generates a closed radial N-pin GeoJSON Polygon around a branch center,
 * matching the `/branches/service-areas` pin editor geometry.
 */
export function buildRadialHexagonPolygon(
  centerLat: number,
  centerLng: number,
  radiusKm = DEFAULT_SERVICE_RADIUS_KM,
  corners = DEFAULT_PIN_CORNERS,
): { type: 'Polygon'; coordinates: [number, number][][] } {
  const latRad = (centerLat * Math.PI) / 180;
  const degPerKmLat = 1 / 110.574;
  const degPerKmLng = 1 / (111.32 * Math.max(0.1, Math.cos(latRad)));
  const pins: PinPoint[] = [];

  for (let i = 0; i < corners; i++) {
    const theta = (2 * Math.PI * i) / corners;
    pins.push({
      lat: round6(centerLat + radiusKm * degPerKmLat * Math.cos(theta)),
      lng: round6(centerLng + radiusKm * degPerKmLng * Math.sin(theta)),
    });
  }

  pins.sort((a, b) => {
    const angA = Math.atan2(a.lat - centerLat, a.lng - centerLng);
    const angB = Math.atan2(b.lat - centerLat, b.lng - centerLng);
    return angA - angB;
  });

  const ring: [number, number][] = pins.map((p) => [round6(p.lng), round6(p.lat)]);
  const first = pins[0];
  if (first) {
    ring.push([round6(first.lng), round6(first.lat)]);
  }

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

function timeToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0));
}

async function upsertBranchServiceArea(
  client: PrismaClient,
  branchId: string,
  branchName: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  const polygon = buildRadialHexagonPolygon(
    latitude,
    longitude,
    DEFAULT_SERVICE_RADIUS_KM,
    DEFAULT_PIN_CORNERS,
  );
  const name = `${branchName} — 2 km Servis Alanı (6 Pin)`;
  const existing = await client.serviceArea.findMany({
    where: { branchId },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });

  const primary = existing[0];
  if (primary) {
    await client.serviceArea.update({
      where: { id: primary.id },
      data: {
        name,
        polygonGeoJson: polygon as object,
        priority: 1,
        isActive: true,
      },
    });
    if (existing.length > 1) {
      await client.serviceArea.deleteMany({
        where: {
          branchId,
          id: { not: primary.id },
        },
      });
    }
  } else {
    await client.serviceArea.create({
      data: {
        branchId,
        name,
        polygonGeoJson: polygon as object,
        priority: 1,
        isActive: true,
      },
    });
  }
}

export async function seedBranches(client: PrismaClient): Promise<{
  branches: number;
  operatingHours: number;
  serviceAreas: number;
}> {
  const branchesData = JSON.parse(
    readFileSync(new URL('./seed-data/branches.json', import.meta.url), 'utf8'),
  ) as BranchSeedData[];

  let branchCount = 0;
  let hoursCount = 0;
  let serviceAreaCount = 0;

  for (const b of branchesData) {
    await client.branch.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        code: b.code,
        name: b.name,
        addressLine: b.addressLine,
        latitude: b.latitude,
        longitude: b.longitude,
        phone: b.phone,
        isActive: b.isActive,
        isAcceptingOrders: b.isAcceptingOrders,
        minOrderMinor: BigInt(b.minOrderMinor),
        deliveryFeeMinor: BigInt(b.deliveryFeeMinor),
        estimatedDeliveryMinutesMin: b.estimatedDeliveryMinutesMin,
        estimatedDeliveryMinutesMax: b.estimatedDeliveryMinutesMax,
        pickupEnabled: b.pickupEnabled,
        deliveryEnabled: b.deliveryEnabled,
      },
      update: {
        code: b.code,
        name: b.name,
        addressLine: b.addressLine,
        latitude: b.latitude,
        longitude: b.longitude,
        phone: b.phone,
        isActive: b.isActive,
        isAcceptingOrders: b.isAcceptingOrders,
        minOrderMinor: BigInt(b.minOrderMinor),
        deliveryFeeMinor: BigInt(b.deliveryFeeMinor),
        estimatedDeliveryMinutesMin: b.estimatedDeliveryMinutesMin,
        estimatedDeliveryMinutesMax: b.estimatedDeliveryMinutesMax,
        pickupEnabled: b.pickupEnabled,
        deliveryEnabled: b.deliveryEnabled,
      },
    });
    branchCount++;

    // Operating hours (7 days / week)
    const hours = [
      { dayOfWeek: 0, opensAt: '12:00', closesAt: '23:00' },
      { dayOfWeek: 1, opensAt: '11:30', closesAt: '23:00' },
      { dayOfWeek: 2, opensAt: '11:30', closesAt: '23:00' },
      { dayOfWeek: 3, opensAt: '11:30', closesAt: '23:00' },
      { dayOfWeek: 4, opensAt: '11:30', closesAt: '23:00' },
      { dayOfWeek: 5, opensAt: '11:30', closesAt: '23:00' },
      { dayOfWeek: 6, opensAt: '11:30', closesAt: '23:00' },
    ];
    for (const h of hours) {
      await client.branchOperatingHours.upsert({
        where: {
          branchId_dayOfWeek: { branchId: b.id, dayOfWeek: h.dayOfWeek },
        },
        create: {
          branchId: b.id,
          dayOfWeek: h.dayOfWeek,
          opensAt: timeToDate(h.opensAt),
          closesAt: timeToDate(h.closesAt),
          isClosed: false,
        },
        update: {
          opensAt: timeToDate(h.opensAt),
          closesAt: timeToDate(h.closesAt),
          isClosed: false,
        },
      });
      hoursCount++;
    }

    await upsertBranchServiceArea(client, b.id, b.name, b.latitude, b.longitude);
    serviceAreaCount++;
  }

  // Also ensure IST-DT (Kadıköy Moda) has a 2 km (6-pin) service area
  const istBranch = await client.branch.findUnique({
    where: { code: 'IST-DT' },
  });
  if (istBranch) {
    await upsertBranchServiceArea(
      client,
      istBranch.id,
      istBranch.name,
      Number(istBranch.latitude),
      Number(istBranch.longitude),
    );
    serviceAreaCount++;
  }

  process.stdout.write(
    `Branch seed completed: ${branchCount} branches, ${hoursCount} operating hour rows, ${serviceAreaCount} service areas upserted.\n`,
  );

  return {
    branches: branchCount,
    operatingHours: hoursCount,
    serviceAreas: serviceAreaCount,
  };
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isEntrypoint) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for the branch seed.');
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  seedBranches(prisma)
    .catch((error: unknown) => {
      console.warn(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
