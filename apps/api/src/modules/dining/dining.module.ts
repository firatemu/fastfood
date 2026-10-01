import { Module } from '@nestjs/common';

import { CustomerAuthModule } from '../auth/customer/customer-auth.module.js';

import { DiningTableController } from './dining-table.controller.js';
import { DiningTableService } from './dining-table.service.js';

@Module({
  imports: [CustomerAuthModule],
  controllers: [DiningTableController],
  providers: [DiningTableService],
  exports: [DiningTableService],
})
export class DiningModule {}
