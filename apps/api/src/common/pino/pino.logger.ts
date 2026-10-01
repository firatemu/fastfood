import { Injectable } from '@nestjs/common';

import { getAppLogger } from '../../bootstrap/app-logger.js';

/**
 * Thin Nest-friendly wrapper that exposes the project's Pino logger.
 * Foundation only; feature modules can import this in Phase 1+.
 */
@Injectable()
export class AppLogger {
  info(...args: unknown[]): void {
    getAppLogger().info(args.length === 1 ? args[0] : { args }, 'nest:info');
  }
  warn(...args: unknown[]): void {
    getAppLogger().warn(args.length === 1 ? args[0] : { args }, 'nest:warn');
  }
  error(...args: unknown[]): void {
    getAppLogger().error(args.length === 1 ? args[0] : { args }, 'nest:error');
  }
  debug(...args: unknown[]): void {
    getAppLogger().debug(args.length === 1 ? args[0] : { args }, 'nest:debug');
  }
}
