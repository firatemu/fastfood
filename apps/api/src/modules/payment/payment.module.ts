import { Module } from '@nestjs/common';

import { getAppConfig } from '../../bootstrap/app-config.js';
import { IdempotencyService } from '../../common/idempotency/idempotency.service.js';
import { CustomerAuthModule } from '../auth/customer/customer-auth.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CheckoutModule } from '../checkout/checkout.module.js';

import { IyzicoCheckoutFormAdapter } from './iyzico-checkout-form.adapter.js';
import { IyzicoClient } from './iyzico-client.js';
import { IyzicoIntegrationController } from './iyzico-integration.controller.js';
import { PaymentController } from './payment.controller.js';
import { PAYMENT_PORT, type PaymentPort } from './payment.port.js';
import { PaymentService } from './payment.service.js';
import { SimulatedPaymentAdapter } from './simulated-payment.adapter.js';

function createPaymentPort(): PaymentPort {
  // Test modules boot without a full environment; only the iyzico gateway needs it.
  if (process.env['PAYMENT_GATEWAY'] !== 'iyzico') return new SimulatedPaymentAdapter();
  const env = getAppConfig();
  const apiOrigin = (env.API_PUBLIC_URL ?? `http://localhost:${env.API_PORT}`).replace(/\/$/, '');
  return new IyzicoCheckoutFormAdapter(
    new IyzicoClient({
      baseUrl: env.IYZICO_BASE_URL,
      apiKey: env.IYZICO_API_KEY,
      secretKey: env.IYZICO_SECRET_KEY,
    }),
    { apiBaseUrl: `${apiOrigin}${env.API_BASE_PATH}` },
  );
}

@Module({
  imports: [CartModule, CheckoutModule, CustomerAuthModule],
  controllers: [PaymentController, IyzicoIntegrationController],
  providers: [
    IdempotencyService,
    { provide: PAYMENT_PORT, useFactory: createPaymentPort },
    PaymentService,
  ],
  exports: [PaymentService, IdempotencyService],
})
export class PaymentModule {}
