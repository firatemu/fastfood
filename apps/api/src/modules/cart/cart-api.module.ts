import { Module } from '@nestjs/common';

import { CustomerAuthModule } from '../auth/customer/customer-auth.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';

import { CartOutboxService } from './cart-outbox.service.js';
import { CartPricingService } from './cart-pricing.service.js';
import { CartValidationService } from './cart-validation.service.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { CartOwnershipPolicy } from './policies/cart-ownership.policy.js';

/**
 * Cart HTTP module — wires the storefront cart endpoints with the
 * canonical envelope.
 *
 * Document 09 + 29. The `CatalogModule` is imported because the
 * cart validation step needs the catalog surface (product active +
 * unit price snapshot). CartOutboxService emits CartLineAdded /
 * CartLineUpdated / CartLineRemoved (document 17 §4).
 */
@Module({
  imports: [CatalogModule, CustomerAuthModule],
  controllers: [CartController],
  providers: [
    CartOutboxService,
    CartService,
    CartPricingService,
    CartValidationService,
    CartOwnershipPolicy,
  ],
  exports: [
    CartService,
    CartOutboxService,
    CartPricingService,
    CartValidationService,
    CartOwnershipPolicy,
  ],
})
export class CartApiModule {}
