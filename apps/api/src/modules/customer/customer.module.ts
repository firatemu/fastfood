import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';

import { CustomerOwnershipPolicy } from './customer-ownership.policy.js';
import { CustomerController } from './customer.controller.js';
import { CustomerService } from './customer.service.js';
import { FavoritesService } from './favorites.service.js';

/**
 * Customer module — `/me` shell + address CRUD.
 *
 * Wires the canonical `CustomerOwnershipPolicy` (document 39 §5)
 * that enforces IDOR protection on every customer-owned resource.
 *
 * Phase 3 ships the in-memory backing store. P3-007 wires the
 * `addresses` repository + the actual `Session` lookup that sets
 * `request.principal`. Persistence is part of Phase 3's bounded
 * scope.
 */
@Module({
  imports: [LoyaltyModule, CatalogModule],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerOwnershipPolicy, FavoritesService],
  exports: [CustomerService, CustomerOwnershipPolicy, FavoritesService],
})
export class CustomerModule {}
