import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

import { SENSITIVE_PATHS } from './redaction.js';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface CreateLoggerOptions {
  service: string;
  environment?: string;
  level?: LogLevel;
}

export type AppLogger = PinoLogger;

/**
 * Create a Pino-based structured logger with mandatory redaction. All
 * application/worker logging should go through this — no console.log in code.
 */
export function createLogger(options: CreateLoggerOptions): AppLogger {
  const isDev = (options.environment ?? process.env.NODE_ENV ?? 'development') === 'development';
  const config: LoggerOptions = {
    name: options.service,
    level: options.level ?? ((process.env.LOG_LEVEL as LogLevel) || 'info'),
    base: {
      service: options.service,
      environment: options.environment ?? process.env.NODE_ENV ?? 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: SENSITIVE_PATHS,
      censor: '[REDACTED]',
      remove: false,
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  };
  if (isDev) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname,service,environment',
      },
    };
  }
  return pino(config);
}
