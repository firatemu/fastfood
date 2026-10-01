import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '.fastfood-controller'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    // Single fork so the in-process CLI invocation in 14-25-cli.test.ts can
    // capture the controller's stdout/stderr directly.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
