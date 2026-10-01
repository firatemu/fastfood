import { Module, forwardRef } from '@nestjs/common';

import { CustomerAuthModule } from '../auth/customer/customer-auth.module.js';
import { BranchModule } from '../branch/branch.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CheckoutModule } from '../checkout/checkout.module.js';
import { CourierModule } from '../courier/courier.module.js';
import { NotificationModule } from '../notification/notification.module.js';

import { CustomerOrderQueryService } from './customer-order-query.service.js';
import { OrderOutboxService } from './order-outbox.service.js';
import { OrderPickupTokenService } from './order-pickup-token.service.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { ReorderService } from './reorder.service.js';

/**
 * Order module — Phase 7 order aggregate, state machine, branch
 * assignment, kitchen board, and customer tracking (documents 10 + 12).
 */
@Module({
  imports: [
    BranchModule,
    CatalogModule,
    CartModule,
    CustomerAuthModule,
    forwardRef(() => CourierModule),
    forwardRef(() => CheckoutModule),
    NotificationModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderOutboxService,
    OrderService,
    CustomerOrderQueryService,
    ReorderService,
    OrderPickupTokenService,
  ],
  exports: [OrderService, OrderOutboxService, CustomerOrderQueryService, ReorderService, OrderPickupTokenService],
})
export class OrderModule {}
