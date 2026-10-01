import { Module } from '@nestjs/common';

import { StorefrontContentController } from './storefront-content.controller.js';
import { StorefrontContentService } from './storefront-content.service.js';

@Module({
  controllers: [StorefrontContentController],
  providers: [StorefrontContentService],
  exports: [StorefrontContentService],
})
export class StorefrontContentModule {}
