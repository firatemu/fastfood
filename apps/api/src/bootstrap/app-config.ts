import { loadServerEnv, type ServerEnv } from '@fastfood/config';

/**
 * Load + memoize the validated server environment exactly once per process.
 * Startup fails loudly when required values are missing.
 */
let cached: ServerEnv | undefined;

export function getAppConfig(): ServerEnv {
  if (!cached) {
    cached = loadServerEnv(process.env);
  }
  return cached;
}
