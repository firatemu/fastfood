import { Module } from '@nestjs/common';

import { AdminPromotionController } from './admin-promotion.controller.js';
import { PromotionService } from './promotion.service.js';
import { StorefrontPromotionController } from './storefront-promotion.controller.js';

@Module({
  controllers: [AdminPromotionController, StorefrontPromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
