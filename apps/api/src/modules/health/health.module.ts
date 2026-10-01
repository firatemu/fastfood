import { Module } from '@nestjs/common';

import { HealthController } from './health.controller.js';
import { VersionController } from './version.controller.js';

@Module({
  controllers: [HealthController, VersionController],
})
export class HealthModule {}
