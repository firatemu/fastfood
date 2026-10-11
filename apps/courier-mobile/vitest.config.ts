import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // `lib/**` holds the app's domain layer (API client, session, delivery
    // status rules). It was previously omitted from `include`, so every test
    // file placed next to that code was silently skipped and vitest exited
    // "No test files found" only when `src` and `app` happened to be empty.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'app/**/*.{test,spec}.{ts,tsx}', 'lib/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.expo'],
  },
});