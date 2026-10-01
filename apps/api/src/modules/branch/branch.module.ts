import { Module } from '@nestjs/common';

import { BranchController } from './branch.controller.js';
import { BranchService } from './branch.service.js';
import { BranchScopePolicy } from './policies/branch-scope.policy.js';
import { RoutingService } from './routing/routing.service.js';

@Module({
  controllers: [BranchController],
  providers: [BranchService, BranchScopePolicy, RoutingService],
  exports: [BranchService, BranchScopePolicy, RoutingService],
})
export class BranchModule {}
