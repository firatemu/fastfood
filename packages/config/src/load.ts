import { clientEnvSchema, serverEnvSchema, type ClientEnv, type ServerEnv } from './schemas.js';

/**
 * Parse and validate process.env against the server schema.
 * Throws a descriptive error when required values are missing or invalid —
 * never silently falls back to insecure defaults.
 */
export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid server environment configuration:\n${issues}`);
  }
  return result.data;
}

/**
 * Parse and validate a raw env-style object against the client schema.
 */
export function loadClientEnv(source: Record<string, string | undefined> = {}): ClientEnv {
  return clientEnvSchema.parse(source);
}
