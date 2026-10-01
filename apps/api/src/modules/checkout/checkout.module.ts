import { Module, forwardRef } from '@nestjs/common';

import { CustomerAuthModule } from '../auth/customer/customer-auth.module.js';
import { BranchModule } from '../branch/branch.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { OrderModule } from '../order/order.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { PromotionModule } from '../promotion/promotion.module.js';

import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

@Module({
  imports: [
    CartModule,
    PricingModule,
    BranchModule,
    PromotionModule,
    CatalogModule,
    LoyaltyModule,
    CustomerAuthModule,
    forwardRef(() => OrderModule),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
