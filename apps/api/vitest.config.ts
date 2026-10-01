import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.ts',
      'test/unit/**/*.{test,spec}.ts',
      '../../tests/api/**/*.{test,spec}.ts',
    ],
    exclude: ['test/integration/**', 'node_modules', 'dist'],
    testTimeout: 20_000,
    setupFiles: ['./test/setup-env.ts'],
  },
});
