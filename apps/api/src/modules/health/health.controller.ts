import { Controller, Get, HttpCode } from '@nestjs/common';

import { getAppLogger } from '../../bootstrap/app-logger.js';

/**
 * Liveness + readiness endpoints — live outside the `/api/v1` global prefix
 * because infrastructure probes (Kubernetes, HAProxy, sidecars) must hit
 * fixed unauthenticated paths (document 40 §9, document 45 §6).
 *
 * The global prefix is therefore excluded for these paths in `main.ts`.
 * The readiness probe deliberately checks only local resources that exist
 * before any business module runs. Postgres / Redis probes are added in
 * Phase 3 once those services become required dependencies.
 */
@Controller()
export class HealthController {
  @Get('health/live')
  @HttpCode(200)
  getLive(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('health/ready')
  @HttpCode(200)
  getReady(): { status: 'ok' } {
    getAppLogger().debug({ endpoint: 'health/ready' }, 'readiness probe');
    return { status: 'ok' };
  }
}
