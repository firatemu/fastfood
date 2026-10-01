import { createAdminClient } from './api';
import { adminMediaSchema } from './schemas';

export const MAX_ADMIN_IMAGE_BYTES = 10 * 1024 * 1024;

export async function fileToBase64Payload(file: File): Promise<{ fileBase64: string }> {
  if (file.size > MAX_ADMIN_IMAGE_BYTES) {
    throw new Error('Görsel en fazla 10 MB olabilir.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('JPEG, PNG, WebP veya GIF seçin.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { fileBase64: btoa(binary) };
}

export async function uploadProductImage(input: {
  productId: string;
  file: File;
  altText?: string;
  displayOrder?: number;
}): Promise<void> {
  const payload = await fileToBase64Payload(input.file);
  await createAdminClient().request({
    method: 'POST',
    path: `admin/products/${input.productId}/media/upload`,
    body: {
      fileBase64: payload.fileBase64,
      altText: input.altText,
      displayOrder: input.displayOrder,
    },
    schema: adminMediaSchema,
  });
}
