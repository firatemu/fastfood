// Shared Vitest config helpers. Each package extends this.
import { defineConfig, mergeConfig } from 'vitest/config';

export const baseVitestConfig = defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});

export function withBase(userConfig) {
  return mergeConfig(baseVitestConfig, userConfig);
}
