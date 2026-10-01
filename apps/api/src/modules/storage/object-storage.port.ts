export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export type StoredObject = {
  body: Buffer;
  contentType: string;
};

export interface ObjectStoragePort {
  putObject(input: { key: string; body: Buffer; contentType: string }): Promise<void>;
  getObject(key: string): Promise<StoredObject | null>;
  publicUrl(key: string): string;
}
