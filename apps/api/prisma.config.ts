import 'dotenv/config';

import path from 'node:path';

import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run Prisma operations.');
}

/**
 * Prisma 7 configuration.
 *
 * Document 35 mandates:
 *   - PostgreSQL 18 + PostGIS 3.6
 *   - UUIDv7 primary IDs via `dbgenerated("uuidv7()")` defaults
 *   - Money represented as `BigInt` minor units
 *
 * Prisma 7 moved the connection URL out of `datasource` and into this
 * config file. The schema.prisma datasource block is intentionally
 * minimal — it only declares the provider and required extensions.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
