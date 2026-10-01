import { Module } from '@nestjs/common';

import { BranchModule } from '../branch/branch.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';

import { StorefrontHomeController } from './storefront-home.controller.js';
import { StorefrontHomeService } from './storefront-home.service.js';

@Module({
  imports: [CatalogModule, BranchModule],
  controllers: [StorefrontHomeController],
  providers: [StorefrontHomeService],
  exports: [StorefrontHomeService],
})
export class StorefrontHomeModule {}
