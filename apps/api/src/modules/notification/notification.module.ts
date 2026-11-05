import { Module } from '@nestjs/common';

import { AdminNotificationController } from './admin-notification.controller.js';
import {
  CustomerNotificationController,
  CustomerPushTokenController,
} from './customer-notification.controller.js';
import { NotificationService } from './notification.service.js';

/**
 * Notifications foundation module (Phase 7) + customer inbox (Storefront Phase 6)
 * + Admin push broadcast and customer push token registration.
 */
@Module({
  controllers: [
    CustomerNotificationController,
    CustomerPushTokenController,
    AdminNotificationController,
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
