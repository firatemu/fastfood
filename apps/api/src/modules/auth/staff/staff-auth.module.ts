import { Module } from '@nestjs/common';

import { StaffAuthController } from './staff-auth.controller.js';
import { StaffAuthService } from './staff-auth.service.js';

/**
 * Staff authentication module (document 07 + 29).
 *
 * Phase 3 ships the canonical staff login + MFA endpoint contract.
 * Production TOTP verification is deferred to Phase 10 per the
 * Phase 3 preparation artifact. The staff user repository is wired
 * into the `users` / `staff_profiles` tables by P3-007.
 */
@Module({
  controllers: [StaffAuthController],
  providers: [StaffAuthService],
  exports: [StaffAuthService],
})
export class StaffAuthModule {}
