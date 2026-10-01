import 'dotenv/config';

import { readFileSync } from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/client/client.js';

type GeographySnapshot = {
  provinces: Array<{
    id: number;
    name: string;
    displayOrder: number;
    centerLatitude: number;
    centerLongitude: number;
    districts: Array<{
      id: number;
      name: string;
      postalCode: string | null;
      neighborhoods: Array<{ id: number; name: string }>;
    }>;
  }>;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for the address geography seed.');

const snapshot = JSON.parse(
  readFileSync(new URL('./seed-data/address-geography.json', import.meta.url), 'utf8'),
) as GeographySnapshot;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const districts = snapshot.provinces.flatMap((province) =>
    province.districts.map(({ id, name, postalCode }) => ({
      id,
      provinceId: province.id,
      name,
      postalCode,
    })),
  );
  const neighborhoods = snapshot.provinces.flatMap((province) =>
    province.districts.flatMap((district) =>
      district.neighborhoods.map(({ id, name }) => ({
        id,
        districtId: district.id,
        name,
        postalCode: null,
      })),
    ),
  );

  const inserted = await prisma.$transaction(async (tx) => {
    const provinces = await tx.addressProvince.createMany({
      data: snapshot.provinces.map(
        ({ id, name, displayOrder, centerLatitude, centerLongitude }) => ({
          id,
          name,
          displayOrder,
          centerLatitude,
          centerLongitude,
        }),
      ),
      skipDuplicates: true,
    });
    const insertedDistricts = await tx.addressDistrict.createMany({
      data: districts,
      skipDuplicates: true,
    });
    const insertedNeighborhoods = await tx.addressNeighborhood.createMany({
      data: neighborhoods,
      skipDuplicates: true,
    });
    return {
      provinces: provinces.count,
      districts: insertedDistricts.count,
      neighborhoods: insertedNeighborhoods.count,
    };
  });
  const [provinceCount, districtCount, neighborhoodCount] = await Promise.all([
    prisma.addressProvince.count(),
    prisma.addressDistrict.count({ where: { provinceId: { in: [1, 80, 27, 33, 34] } } }),
    prisma.addressNeighborhood.count({
      where: { district: { provinceId: { in: [1, 80, 27, 33, 34] } } },
    }),
  ]);
  process.stdout.write(
    `Address geography inserted ${inserted.provinces}/${inserted.districts}/${inserted.neighborhoods}; database has ${provinceCount}/${districtCount}/${neighborhoodCount} provinces/districts/neighborhoods.\n`,
  );
}

main()
  .catch((error: unknown) => {
    console.warn(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
