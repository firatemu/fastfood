import { Queue, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

import { getAppConfig } from '../bootstrap/app-config.js';
import { getAppLogger } from '../bootstrap/app-logger.js';

let redis: IORedis | undefined;
let connection: ConnectionOptions | undefined;

/**
 * Phase 0 BullMQ foundation. Real queues (notifications, media processing,
 * payment reconciliation, etc.) are added in later phases. The connection
 * helper here is shared by every queue so configuration stays centralized.
 */
export function getBullConnection(): ConnectionOptions {
  if (!connection) {
    const cfg = getAppConfig();
    const url = new URL(cfg.REDIS_URL);
    connection = {
      host: url.hostname,
      port: Number(url.port) || 6379,
      ...(url.password ? { password: url.password } : {}),
      ...(url.username ? { username: url.username } : {}),
    };
  }
  return connection;
}

export function getRedisClient(): IORedis {
  if (!redis) {
    const cfg = getAppConfig();
    redis = new IORedis(cfg.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    const logger = getAppLogger();
    redis.on('connect', () => logger.info({ host: cfg.REDIS_URL }, 'redis connected'));
    redis.on('error', (err) => logger.error({ err: err.message }, 'redis error'));
  }
  return redis;
}

export function createQueue(name: string): Queue {
  return new Queue(name, { connection: getBullConnection() });
}
