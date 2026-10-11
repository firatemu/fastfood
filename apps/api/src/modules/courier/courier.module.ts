import { Module, forwardRef } from '@nestjs/common';

import { OrderModule } from '../order/order.module.js';

import { CourierAdminController } from './courier-admin.controller.js';
import { CourierAdminService } from './courier-admin.service.js';
import { CourierController } from './courier.controller.js';
import { DeliveryService } from './delivery.service.js';

/**
 * Courier / delivery module (Phase 8 — document 15).
 */
@Module({
  imports: [forwardRef(() => OrderModule)],
  controllers: [CourierController, CourierAdminController],
  providers: [DeliveryService, CourierAdminService],
  exports: [DeliveryService, CourierAdminService],
})
export class CourierModule {}
