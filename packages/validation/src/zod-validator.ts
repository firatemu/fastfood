/**
 * Single NestJS Zod validation pipe factory.
 *
 * Document 03 §5 mandates that NestJS uses one project-owned Zod validation
 * adapter — no duplicated class-validator schemas. This module is that adapter.
 */
import { ErrorCodes } from '@fastfood/contracts';
import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

/**
 * Local PipeTransform shape (compatible with @nestjs/common's interface)
 * so this package does not need to depend on a specific deep import path.
 */
type PipeTransform<TInput = unknown, TOutput = unknown> = (
  value: TInput,
  metadata: ArgumentMetadata,
) => TOutput;

export interface ZodValidationPipeOptions {
  /** Strip unknown keys instead of erroring. Defaults to false. */
  stripUnknown?: boolean;
}

/**
 * Build a NestJS PipeTransform that validates the input value against the
 * provided Zod schema. Validation failures are translated to the canonical
 * `VALIDATION_ERROR` error envelope (document 40 §5).
 */
/**
 * Build a NestJS PipeTransform that validates the input value against the
 * provided Zod schema. Validation failures are translated to the canonical
 * `VALIDATION_ERROR` error envelope (document 40 §5).
 *
 * Returns a callable pipe function (compatible with the NestJS PipeTransform
 * interface) so this package does not need to depend on internal Nest types.
 */
export function createZodValidationPipe<T extends ZodTypeAny>(
  schema: T,
  _options: ZodValidationPipeOptions = {},
): PipeTransform<unknown, z.infer<T>> {
  return (value: unknown): z.infer<T> => {
    const result = schema.safeParse(value);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        code: issue.code,
        message: issue.message,
      }));
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'One or more fields are invalid.',
        details: { fields },
      });
    }
    return result.data;
  };
}

/**
 * Standalone helper for validating inside services that don't go through a
 * NestJS pipe. Returns either parsed data or a structured validation failure
 * object that the caller can map to a domain error.
 */
export function safeValidate<T extends ZodTypeAny>(
  schema: T,
  value: unknown,
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; issues: { path: string; code: string; message: string }[] } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      code: issue.code,
      message: issue.message,
    })),
  };
}
