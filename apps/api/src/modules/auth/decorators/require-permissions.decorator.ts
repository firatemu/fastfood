import type { PermissionCode } from '@fastfood/domain-types';
import { SetMetadata } from '@nestjs/common';

/**
 * Canonical permission metadata decorator (document 39 §3).
 * The actual enforcement guard is wired in Phase 3.
 */
export const PERMISSIONS_METADATA_KEY = 'fastfood:require_permissions';

export function RequirePermissions(...codes: PermissionCode[]): MethodDecorator {
  return SetMetadata(PERMISSIONS_METADATA_KEY, codes);
}
