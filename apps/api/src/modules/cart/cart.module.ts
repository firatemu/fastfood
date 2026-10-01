import { Module } from '@nestjs/common';

import { CartOutboxService } from './cart-outbox.service.js';
import { CartService } from './cart.service.js';

/**
 * Cart module (document 09 + 29).
 *
 * Phase 5 ships the cart domain service against the in-memory
 * backing store. The CartRepository against the `carts` /
 * `cart_line_items` / `cart_line_modifiers` / `cart_line_removals`
 * tables lands under P5-006 when the storefront cart endpoints
 * need persistent state across server restarts.
 */
@Module({
  providers: [CartOutboxService, CartService],
  exports: [CartOutboxService, CartService],
})
export class CartModule {}
