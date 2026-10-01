import { Module, forwardRef } from '@nestjs/common';

import { OrderModule } from '../order/order.module.js';

import { CourierController } from './courier.controller.js';
import { DeliveryService } from './delivery.service.js';

/**
 * Courier / delivery module (Phase 8 — document 15).
 */
@Module({
  imports: [forwardRef(() => OrderModule)],
  controllers: [CourierController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class CourierModule {}
