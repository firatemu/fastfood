import { describe, expect, it } from 'vitest';

import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import { detectImage, isPublicProductMediaKey } from '../../src/modules/storage/detect-image.js';
import { InMemoryObjectStorage } from '../../src/modules/storage/in-memory-object-storage.js';
import { signS3Request } from '../../src/modules/storage/s3-object-storage.adapter.js';

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

describe('product image upload', () => {
  it('detects PNG magic and public media keys', () => {
    expect(detectImage(PNG)?.contentType).toBe('image/png');
    expect(isPublicProductMediaKey('products/01900000-0000-7000-8000-000000000001.png')).toBe(true);
    expect(isPublicProductMediaKey('../secret.png')).toBe(false);
  });

  it('signs path-style S3 requests', () => {
    const signed = signS3Request({
      method: 'PUT',
      url: new URL('http://localhost:9098/fastfood-dev/products/a.png'),
      body: PNG,
      accessKey: 'fastfood',
      secretKey: 'fastfood-dev-secret',
      region: 'us-east-1',
      now: new Date('2026-09-21T12:00:00.000Z'),
    });
    expect(signed.authorization).toContain('AWS4-HMAC-SHA256 Credential=fastfood/');
    expect(signed.payloadHash).toHaveLength(64);
  });

  it('uploads bytes through object storage and stores a public URL', async () => {
    const storage = new InMemoryObjectStorage('http://localhost:4000/api/v1');
    const catalog = new CatalogService(null, storage);
    const product = await catalog.createProduct({
      categoryId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
      slug: 'upload-burger',
      name: 'Upload Burger',
      basePriceMinor: 10000n,
    });
    const created = await catalog.uploadProductMedia(product.id, {
      fileBase64: PNG.toString('base64'),
      altText: 'Burger',
    });
    expect(created.url).toMatch(/^http:\/\/localhost:4000\/api\/v1\/public\/media\/products\/.+\.png$/);
    const listed = await catalog.listProductMedia(product.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.altText).toBe('Burger');
    const key = created.url.replace('http://localhost:4000/api/v1/public/media/', '');
    const stored = await storage.getObject(key);
    expect(stored?.contentType).toBe('image/png');
  });
});
