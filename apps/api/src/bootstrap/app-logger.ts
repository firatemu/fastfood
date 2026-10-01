import { createLogger, type AppLogger } from '@fastfood/observability';

import { getAppConfig } from './app-config.js';

let cached: AppLogger | undefined;

export function getAppLogger(): AppLogger {
  if (!cached) {
    const cfg = getAppConfig();
    cached = createLogger({
      service: 'fastfood-api',
      environment: cfg.NODE_ENV,
      level: cfg.LOG_LEVEL,
    });
  }
  return cached;
}
