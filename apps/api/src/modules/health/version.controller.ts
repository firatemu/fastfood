import { API_PREFIX } from '@fastfood/contracts';
import { Controller, Get, HttpCode } from '@nestjs/common';

/**
 * API version endpoint — lives at `/api/v1/version` via the global API prefix.
 *
 * Document 17 §1: every public endpoint is versioned under `/api/v1`.
 * Document 40 + 45: this endpoint reports the running API version.
 *
 * The controller deliberately lives at the root path; the global `/api/v1`
 * prefix from `main.ts` prepends itself automatically.
 */
@Controller({ path: '', version: undefined })
export class VersionController {
  @Get('version')
  @HttpCode(200)
  getVersion(): { version: string; apiPrefix: string; environment: string } {
    return {
      version: '0.0.0-phase0',
      apiPrefix: API_PREFIX,
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
