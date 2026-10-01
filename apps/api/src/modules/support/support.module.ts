import { Module, forwardRef } from '@nestjs/common';

import { OrderModule } from '../order/order.module.js';

import { SupportChatController } from './support-chat.controller.js';
import { SupportChatService } from './support-chat.service.js';

@Module({
  imports: [forwardRef(() => OrderModule)],
  controllers: [SupportChatController],
  providers: [SupportChatService],
  exports: [SupportChatService],
})
export class SupportModule {}
