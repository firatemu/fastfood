import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client/client.js';
import { seedBranches } from '../prisma/seed-branches.js';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://fastfood:fastfood@localhost:5439/fastfood?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- 1. Syncing Burger Home Branches, Hours & 2 km (6-Pin) Service Areas ---');
  await prisma.branch.updateMany({
    where: { code: 'IST-DT' },
    data: {
      latitude: 41.0369,
      longitude: 28.9847,
      addressLine: 'Moda Caddesi 12, Kadıköy, İstanbul',
    },
  });

  const summary = await seedBranches(prisma);
  console.log(
    `\n✅ Synced ${summary.branches} Burger Home branches (+ IST-DT), ${summary.operatingHours} hour rows, ${summary.serviceAreas} 2 km (6-pin) service areas!`,
  );
}

main()
  .catch((e) => {
    console.error('Error running branch sync script:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
