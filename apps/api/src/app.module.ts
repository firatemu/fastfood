import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

import { DatabaseModule } from './common/database/database.module.js';
import { AppExceptionFilter } from './common/http/app-exception.filter.js';
import { RequestIdMiddleware } from './common/http/request-id.middleware.js';
import { InfrastructureModule } from './common/infrastructure.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CustomerAuthModule } from './modules/auth/customer/customer-auth.module.js';
import { BranchModule } from './modules/branch/branch.module.js';
import { CartApiModule } from './modules/cart/cart-api.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { CheckoutModule } from './modules/checkout/checkout.module.js';
import { CourierModule } from './modules/courier/courier.module.js';
import { CustomerModule } from './modules/customer/customer.module.js';
import { DiningModule } from './modules/dining/dining.module.js';
import { GamificationModule } from './modules/gamification/gamification.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { LoyaltyModule } from './modules/loyalty/loyalty.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PromotionModule } from './modules/promotion/promotion.module.js';
import { RefundModule } from './modules/refund/refund.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { StorefrontContentModule } from './modules/storefront-content/storefront-content.module.js';
import { StorefrontHomeModule } from './modules/storefront-home/storefront-home.module.js';
import { SupportModule } from './modules/support/support.module.js';

@Module({
  imports: [
    DatabaseModule,
    InfrastructureModule,
    HealthModule,
    AuthModule,
    CustomerAuthModule,
    BranchModule,
    CatalogModule,
    CartApiModule,
    CheckoutModule,
    LoyaltyModule,
    PaymentModule,
    OrderModule,
    NotificationModule,
    CourierModule,
    RefundModule,
    ReportingModule,
    CustomerModule,
    AdminModule,
    PromotionModule,
    StorefrontHomeModule,
    StorefrontContentModule,
    StorageModule,
    GamificationModule,
    DiningModule,
    SupportModule,
  ],
})
export class AppModule implements NestModule {
  /**
   * Request-id middleware is bound to every route. Nest middleware route
   * patterns are matched against the path AFTER the global `/api/v1` prefix
   * (see `main.ts`). The named-wildcard form `{*wildcard}` is required by
   * `path-to-regexp@6` (the previous anonymous `*` triggers
   * `LegacyRouteConverter` warnings).
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*wildcard}');
  }
}

export { AppExceptionFilter };
