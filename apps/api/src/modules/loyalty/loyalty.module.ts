import { Module } from '@nestjs/common';

import { CustomerAuthModule } from '../auth/customer/customer-auth.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { PromotionModule } from '../promotion/promotion.module.js';

import { ClubController } from './club.controller.js';
import { ClubService } from './club.service.js';
import { LoyaltyController } from './loyalty.controller.js';
import { LoyaltyService } from './loyalty.service.js';

@Module({
  imports: [CustomerAuthModule, PromotionModule, NotificationModule],
  controllers: [LoyaltyController, ClubController],
  providers: [LoyaltyService, ClubService],
  exports: [LoyaltyService, ClubService],
})
export class LoyaltyModule {}
