import { Module } from '@nestjs/common';

import { PaymentModule } from '../payment/payment.module.js';

import { RefundController } from './refund.controller.js';
import { RefundService } from './refund.service.js';

@Module({
  imports: [PaymentModule],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
