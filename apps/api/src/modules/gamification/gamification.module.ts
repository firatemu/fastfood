import { Module } from '@nestjs/common';

import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { PromotionModule } from '../promotion/promotion.module.js';

import { SpinController } from './spin.controller.js';
import { SpinService } from './spin.service.js';

@Module({
  imports: [LoyaltyModule, PromotionModule, NotificationModule],
  controllers: [SpinController],
  providers: [SpinService],
  exports: [SpinService],
})
export class GamificationModule {}
