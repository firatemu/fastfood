import { Module } from '@nestjs/common';

import { IdempotencyService } from '../../common/idempotency/idempotency.service.js';
import { CustomerAuthModule } from '../auth/customer/customer-auth.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CheckoutModule } from '../checkout/checkout.module.js';

import { IyzicoIntegrationController } from './iyzico-integration.controller.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';

@Module({
  imports: [CartModule, CheckoutModule, CustomerAuthModule],
  controllers: [PaymentController, IyzicoIntegrationController],
  providers: [IdempotencyService, PaymentService],
  exports: [PaymentService, IdempotencyService],
})
export class PaymentModule {}
