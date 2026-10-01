import type { ObjectStoragePort, StoredObject } from './object-storage.port.js';

export class InMemoryObjectStorage implements ObjectStoragePort {
  readonly #objects = new Map<string, StoredObject>();

  constructor(private readonly publicBaseUrl: string) {}

  async putObject(input: { key: string; body: Buffer; contentType: string }): Promise<void> {
    this.#objects.set(input.key, { body: input.body, contentType: input.contentType });
  }

  async getObject(key: string): Promise<StoredObject | null> {
    return this.#objects.get(key) ?? null;
  }

  publicUrl(key: string): string {
    const base = this.publicBaseUrl.replace(/\/$/, '');
    return `${base}/public/media/${key}`;
  }
}
