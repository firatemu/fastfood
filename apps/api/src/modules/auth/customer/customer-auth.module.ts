import { Global, Module } from '@nestjs/common';

import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';

/**
 * Customer authentication module (document 07 + 17 + 29).
 *
 * Phase 3 ships the canonical customer OTP + refresh endpoints under
 * `/api/v1/auth/customer/*` + the shared session endpoints
 * `/api/v1/auth/{refresh,logout,sessions}`. P3-007 wires the Session
 * repository; P3-008 wires audit + outbox event emission.
 */
@Global()
@Module({
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService],
  exports: [CustomerAuthService],
})
export class CustomerAuthModule {}
