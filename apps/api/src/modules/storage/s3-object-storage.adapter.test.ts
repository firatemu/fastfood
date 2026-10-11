import { describe, expect, it } from 'vitest';

import { S3ObjectStorageAdapter } from './s3-object-storage.adapter.js';

const baseEnv = {
  S3_ENDPOINT: 'http://minio:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'fastfood',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  API_PORT: 4000,
  API_BASE_PATH: '/api/v1',
};

describe('S3ObjectStorageAdapter.publicUrl', () => {
  it('falls back to the local API origin when API_PUBLIC_URL is unset', () => {
    const adapter = new S3ObjectStorageAdapter({ ...baseEnv, API_PUBLIC_URL: undefined });
    expect(adapter.publicUrl('catalog/a.webp')).toBe(
      'http://localhost:4000/api/v1/public/media/catalog/a.webp',
    );
  });

  it('uses API_PUBLIC_URL and tolerates a trailing slash', () => {
    const adapter = new S3ObjectStorageAdapter({
      ...baseEnv,
      API_PUBLIC_URL: 'https://apiburger.azem.cloud/',
    });
    expect(adapter.publicUrl('catalog/a.webp')).toBe(
      'https://apiburger.azem.cloud/api/v1/public/media/catalog/a.webp',
    );
  });
});
