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

const EARTH_RADIUS_KM = 6371.0;

function generateCirclePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  numPoints = 64,
): { type: 'Polygon'; coordinates: [number, number][][] } {
  const d = radiusKm / EARTH_RADIUS_KM;
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;
  const ring: [number, number][] = [];

  for (let i = 0; i < numPoints; i++) {
    const bearing = (2 * Math.PI * i) / numPoints;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinD = Math.sin(d);
    const cosD = Math.cos(d);
    const sinBearing = Math.sin(bearing);
    const cosBearing = Math.cos(bearing);

    const ptLatRad = Math.asin(sinLat * cosD + cosLat * sinD * cosBearing);
    const ptLngRad =
      lngRad + Math.atan2(sinBearing * sinD * cosLat, cosD - sinLat * Math.sin(ptLatRad));

    const ptLat = (ptLatRad * 180) / Math.PI;
    let ptLng = (ptLngRad * 180) / Math.PI;
    ptLng = ((ptLng + 540) % 360) - 180;

    ring.push([ptLng, ptLat]);
  }

  const firstPoint = ring[0];
  if (firstPoint) {
    ring.push([firstPoint[0], firstPoint[1]]);
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

const branchesData = JSON.parse(
  readFileSync(new URL('./seed-data/branches.json', import.meta.url), 'utf8'),
) as BranchSeedData[];

export async function seedBranches(client: PrismaClient): Promise<{
  branches: number;
  operatingHours: number;
  serviceAreas: number;
}> {
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

    // Service Area: 10km circle customer distance
    const polygon = generateCirclePolygon(b.latitude, b.longitude, 10.0, 64);
    const existingArea = await client.serviceArea.findFirst({
      where: { branchId: b.id },
    });

    if (existingArea) {
      await client.serviceArea.update({
        where: { id: existingArea.id },
        data: {
          name: `${b.name} — Maks. 10km Müşteri Uzaklığı`,
          polygonGeoJson: polygon as object,
          priority: 1,
          isActive: true,
        },
      });
    } else {
      await client.serviceArea.create({
        data: {
          branchId: b.id,
          name: `${b.name} — Maks. 10km Müşteri Uzaklığı`,
          polygonGeoJson: polygon as object,
          priority: 1,
          isActive: true,
        },
      });
    }
    serviceAreaCount++;
  }

  // Also ensure IST-DT (Kadıköy Moda) has accurate 10km service area
  const istBranch = await client.branch.findUnique({
    where: { code: 'IST-DT' },
  });
  if (istBranch) {
    const lat = Number(istBranch.latitude);
    const lng = Number(istBranch.longitude);
    const polygon = generateCirclePolygon(lat, lng, 10.0, 64);
    const istArea = await client.serviceArea.findFirst({
      where: { branchId: istBranch.id },
    });
    if (istArea) {
      await client.serviceArea.update({
        where: { id: istArea.id },
        data: {
          polygonGeoJson: polygon as object,
          isActive: true,
        },
      });
    }
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
