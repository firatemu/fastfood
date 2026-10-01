import { Module } from '@nestjs/common';

import { CustomerNotificationController } from './customer-notification.controller.js';
import { NotificationService } from './notification.service.js';

/**
 * Notifications foundation module (Phase 7) + customer inbox (Storefront Phase 6).
 */
@Module({
  controllers: [CustomerNotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
