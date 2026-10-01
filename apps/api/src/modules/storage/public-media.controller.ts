import { ErrorCodes } from '@fastfood/contracts';
import { Controller, Get, Inject, NotFoundException, Param, StreamableFile } from '@nestjs/common';

import { isPublicProductMediaKey } from './detect-image.js';
import { OBJECT_STORAGE, type ObjectStoragePort } from './object-storage.port.js';

@Controller({ path: 'public/media' })
export class PublicMediaController {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort) {}

  @Get('products/:file')
  async getProductImage(@Param('file') file: string): Promise<StreamableFile> {
    const key = `products/${file}`;
    if (!isPublicProductMediaKey(key)) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Media not found.',
      });
    }
    const object = await this.storage.getObject(key);
    if (!object) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Media not found.',
      });
    }
    return new StreamableFile(object.body, {
      type: object.contentType,
      disposition: 'inline',
    });
  }
}
