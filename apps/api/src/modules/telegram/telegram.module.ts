import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../common/database/database.module.js';

import { TelegramService } from './telegram.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
