import { loadServerEnv, type ServerEnv } from '@fastfood/config';

let cached: ServerEnv | undefined;

export function getAppConfig(): ServerEnv {
  if (!cached) {
    cached = loadServerEnv(process.env);
  }
  return cached;
}
