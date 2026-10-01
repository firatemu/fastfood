export const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;

export type DetectedImage = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  extension: 'jpg' | 'png' | 'webp' | 'gif';
};

export function detectImage(body: Buffer): DetectedImage | null {
  if (body.length < 12 || body.length > MAX_UPLOAD_IMAGE_BYTES) return null;
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (body[0] === 0x47 && body[1] === 0x49 && body[2] === 0x46) {
    return { contentType: 'image/gif', extension: 'gif' };
  }
  const riff = body.subarray(0, 4).toString('ascii');
  const webp = body.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  return null;
}

export function decodeBase64Image(fileBase64: string): Buffer | null {
  const trimmed = fileBase64.trim();
  if (!trimmed || trimmed.length > Math.ceil((MAX_UPLOAD_IMAGE_BYTES * 4) / 3) + 64) {
    return null;
  }
  try {
    const body = Buffer.from(trimmed, 'base64');
    if (body.length === 0 || body.length > MAX_UPLOAD_IMAGE_BYTES) return null;
    return body;
  } catch {
    return null;
  }
}

export function isPublicProductMediaKey(key: string): boolean {
  return /^products\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(key);
}
