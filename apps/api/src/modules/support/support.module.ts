import { Module, forwardRef } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module.js';
import { OrderModule } from '../order/order.module.js';

import { AdminSupportController } from './admin-support.controller.js';
import { SupportChatController } from './support-chat.controller.js';
import { SupportChatService } from './support-chat.service.js';

@Module({
  imports: [forwardRef(() => OrderModule), NotificationModule],
  controllers: [SupportChatController, AdminSupportController],
  providers: [SupportChatService],
  exports: [SupportChatService],
})
export class SupportModule {}
