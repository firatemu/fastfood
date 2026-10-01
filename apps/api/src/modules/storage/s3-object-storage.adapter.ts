import { createHash, createHmac } from 'node:crypto';

import type { ServerEnv } from '@fastfood/config';

import type { ObjectStoragePort, StoredObject } from './object-storage.port.js';

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function amzDateNow(now = new Date()): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

export function signS3Request(input: {
  method: 'GET' | 'PUT';
  url: URL;
  body: Buffer;
  accessKey: string;
  secretKey: string;
  region: string;
  now?: Date;
}): { authorization: string; amzDate: string; payloadHash: string } {
  const { amzDate, dateStamp } = amzDateNow(input.now);
  const payloadHash = sha256Hex(input.body);
  const host = input.url.host;
  const canonicalUri = input.url.pathname
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
    .replaceAll('%2F', '/');
  const canonicalQuery = [...input.url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    input.method,
    canonicalUri || '/',
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const kDate = hmac(`AWS4${input.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    amzDate,
    payloadHash,
  };
}

export class S3ObjectStorageAdapter implements ObjectStoragePort {
  #bucketReady = false;

  constructor(
    private readonly env: Pick<
      ServerEnv,
      | 'S3_ENDPOINT'
      | 'S3_REGION'
      | 'S3_BUCKET'
      | 'S3_ACCESS_KEY'
      | 'S3_SECRET_KEY'
      | 'API_PORT'
      | 'API_BASE_PATH'
    >,
    private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  publicUrl(key: string): string {
    return `http://localhost:${this.env.API_PORT}${this.env.API_BASE_PATH}/public/media/${key}`;
  }

  async putObject(input: { key: string; body: Buffer; contentType: string }): Promise<void> {
    await this.#ensureBucket();
    const response = await this.#signed('PUT', this.#objectUrl(input.key), input.body, {
      'Content-Type': input.contentType,
    });
    if (!response.ok) {
      throw new Error(`S3 put failed (${response.status})`);
    }
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const response = await this.#signed('GET', this.#objectUrl(key), Buffer.alloc(0));
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`S3 get failed (${response.status})`);
    }
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const body = Buffer.from(await response.arrayBuffer());
    return { body, contentType };
  }

  #objectUrl(key: string): URL {
    const endpoint = this.env.S3_ENDPOINT.replace(/\/$/, '');
    return new URL(`${endpoint}/${this.env.S3_BUCKET}/${key}`);
  }

  async #ensureBucket(): Promise<void> {
    if (this.#bucketReady) return;
    const endpoint = this.env.S3_ENDPOINT.replace(/\/$/, '');
    const url = new URL(`${endpoint}/${this.env.S3_BUCKET}`);
    const response = await this.#signed('PUT', url, Buffer.alloc(0));
    if (response.ok || response.status === 409) {
      this.#bucketReady = true;
      return;
    }
    throw new Error(`S3 bucket ensure failed (${response.status})`);
  }

  async #signed(
    method: 'GET' | 'PUT',
    url: URL,
    body: Buffer,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> {
    const signed = signS3Request({
      method,
      url,
      body,
      accessKey: this.env.S3_ACCESS_KEY,
      secretKey: this.env.S3_SECRET_KEY,
      region: this.env.S3_REGION,
    });
    return this.fetchImpl(url, {
      method,
      headers: {
        Authorization: signed.authorization,
        'x-amz-content-sha256': signed.payloadHash,
        'x-amz-date': signed.amzDate,
        Host: url.host,
        ...extraHeaders,
      },
      body: method === 'GET' ? undefined : body,
    });
  }
}
