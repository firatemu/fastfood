import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { WorkerAppModule } from './app.module.js';
import { getAppConfig } from './bootstrap/app-config.js';
import { getAppLogger } from './bootstrap/app-logger.js';
import { createQueue, getRedisClient } from './queues/queue.connection.js';

/**
 * FASTFOOD worker entry point. Phase 0 boots the Nest container, verifies
 * Redis connectivity, and registers a placeholder BullMQ queue so the
 * deployment image is exercised end to end.
 */
async function bootstrap(): Promise<void> {
  const cfg = getAppConfig();
  const logger = getAppLogger();

  const app = await NestFactory.createApplicationContext(WorkerAppModule, { logger: false });
  logger.info({ env: cfg.NODE_ENV }, 'worker bootstrap starting');

  const redis = getRedisClient();
  await redis.ping();
  logger.info('redis ping ok');

  // Phase 0 placeholder queue. Real queues (notification, media, payment
  // reconciliation) are added in Phase 7+ per the roadmap.
  const placeholder = createQueue('phase0-placeholder');
  const placeholderCount = await placeholder.getJobCounts();
  logger.info({ jobs: placeholderCount }, 'phase0:placeholder queue ready');

  await app.close();
  await placeholder.close();
  await redis.quit();
  logger.info('worker bootstrap complete');
}

bootstrap().catch((error) => {
  console.error('Worker fatal startup error', error);
  process.exit(1);
});
