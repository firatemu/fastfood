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

/**
 * Production-readiness audit P0-6: the gateway is read from the validated
 * configuration, never from `process.env` directly, so the guard in
 * `packages/config` cannot be bypassed. A simulated gateway in production is
 * a fatal boot error — the simulated adapter trusts client-asserted payment
 * status, so a live deployment would mark unpaid orders as paid.
 */
function createPaymentPort(): PaymentPort {
  const env = getAppConfig();
  if (env.PAYMENT_GATEWAY === 'simulated') {
    return new SimulatedPaymentAdapter({
      nodeEnv: env.NODE_ENV,
      explicitlyAllowed: env.ALLOW_SIMULATED_PAYMENTS,
    });
  }
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
  exports: [PaymentService, IdempotencyService, PAYMENT_PORT],
})
export class PaymentModule {}
