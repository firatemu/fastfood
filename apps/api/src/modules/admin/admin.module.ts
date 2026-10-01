import { Module } from '@nestjs/common';

import { BranchModule } from '../branch/branch.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { PaymentModule } from '../payment/payment.module.js';

import { AdminAuditController } from './admin-audit.controller.js';
import { AdminBranchController } from './admin-branch.controller.js';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCustomerController } from './admin-customer.controller.js';
import { AdminCustomerService } from './admin-customer.service.js';
import { AdminPaymentController } from './admin-payment.controller.js';
import { AdminSettingsController } from './admin-settings.controller.js';
import { AdminUserController } from './admin-user.controller.js';
import { AdminUserService } from './admin-user.service.js';
import { AuditQueryService } from './audit-query.service.js';
import { SettingsService } from './settings.service.js';

/**
 * Admin module — privileged catalog + branch management endpoints.
 *
 * Document 29. Phase 4 ships:
 *   - /api/v1/admin/categories*
 *   - /api/v1/admin/products* (write surface)
 *   - /api/v1/admin/allergens*
 *   - /api/v1/admin/branches* (write surface)
 *   - /api/v1/admin/branches/:branchId/service-areas
 *   - /api/v1/admin/branches/:branchId/operating-hours
 *   - /api/v1/admin/branches/:branchId/product-availability
 *   - /api/v1/admin/branches/:branchId/product-availability/:productId
 *
 * RBAC permissions (document 39): branches.read/write,
 * branches.service_areas.write, catalog.products.read/write,
 * catalog.prices.write, catalog.media.write.
 */
@Module({
  imports: [CatalogModule, BranchModule, PaymentModule, LoyaltyModule],
  controllers: [
    AdminCatalogController,
    AdminBranchController,
    AdminPaymentController,
    AdminAuditController,
    AdminSettingsController,
    AdminUserController,
    AdminCustomerController,
  ],
  providers: [SettingsService, AuditQueryService, AdminUserService, AdminCustomerService],
})
export class AdminModule {}
