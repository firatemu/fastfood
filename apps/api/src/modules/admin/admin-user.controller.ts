import { ErrorCodes } from '@fastfood/contracts';
import { adminPagePermission } from '@fastfood/domain-types';
import { getRequestContext } from '@fastfood/observability';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { AdminUserService } from './admin-user.service.js';

type StaffRequest = FastifyRequest & {
  principal?: AuthenticatedPrincipal;
  authenticatedUserId?: string;
};

const createStaffSchema = z.object({
  email: z.string().trim().email().max(255),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(256),
  roleIds: z
    .array(z.string().uuid())
    .min(1)
    .max(20)
    .refine((ids) => new Set(ids).size === ids.length),
  branchIds: z
    .array(z.string().uuid())
    .max(1)
    .refine((ids) => new Set(ids).size === ids.length),
  permissionCodes: z.array(z.string().min(3).max(128)).max(300).optional(),
});
const setPasswordSchema = z.object({ password: z.string().min(12).max(256) }).strict();
const permissionsSchema = z
  .object({
    permissionCodes: z.array(z.string().min(3).max(128)).max(300),
    customPermissionsEnabled: z.boolean(),
  })
  .strict();
const roleSchema = z.object({ roleId: z.string().uuid() });
const displayNameSchema = z.object({ displayName: z.string().trim().min(1).max(120) });
const emailSchema = z.object({ email: z.string().trim().email().max(255) });
const statusSchema = z.object({ status: z.enum(['ACTIVE', 'DISABLED']) });
const branchesSchema = z.object({
  branchIds: z
    .array(z.string().uuid())
    .max(1)
    .refine((ids) => new Set(ids).size === ids.length),
});

function requestId(): string {
  return getRequestContext()?.requestId ?? '01900000-0000-7000-8000-000000000099';
}

function requirePrincipal(req: StaffRequest): AuthenticatedPrincipal {
  if (!req.principal) throw new Error('AUTH_PRINCIPAL_REQUIRED');
  return req.principal;
}

function validationError(issues: unknown): unknown {
  return {
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'One or more fields are invalid.',
      details: { fields: issues },
      requestId: requestId(),
    },
  };
}

function serviceError(error: unknown): unknown {
  const reason = error instanceof Error ? error.message : '';
  const map: Record<string, { code: string; message: string }> = {
    NOT_FOUND: {
      code: ErrorCodes.NOT_FOUND,
      message: 'Staff user or selected resource was not found.',
    },
    IDENTIFIER_EXISTS: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'This email is already in use.',
    },
    ROLE_REQUIRED: { code: ErrorCodes.VALIDATION_ERROR, message: 'At least one role is required.' },
    ROLE_NOT_FOUND: {
      code: ErrorCodes.NOT_FOUND,
      message: 'One or more selected roles were not found.',
    },
    BRANCH_NOT_FOUND: {
      code: ErrorCodes.NOT_FOUND,
      message: 'One or more selected active branches were not found.',
    },
    BRANCH_NOT_ACTIVE: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'New branches require an assigned Branch Admin before staff can be added.',
    },
    BRANCH_SCOPE_DENIED: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Selected staff or branches are outside your assigned branch scope.',
    },
    ROLE_GRANT_DENIED: {
      code: ErrorCodes.AUTH_PERMISSION_DENIED,
      message: 'Your role does not authorize this role assignment.',
    },
    ALREADY_ASSIGNED: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'This role is already assigned.',
    },
    SELF_PASSWORD_RESET: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'You cannot reset your own staff password through this action.',
    },
    ACCOUNT_PASSWORD_REQUIRED: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Set an account password before restoring access.',
    },
    ACCOUNT_NOT_ACTIVE: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Only active staff accounts can change their email.',
    },
    SELF_DISABLE: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'You cannot disable your own account.',
    },
    SELF_ROLE_CHANGE: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'You cannot remove a role from your own account.',
    },
    SELF_SCOPE_CHANGE: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'You cannot change your own branch scope.',
    },
    LAST_SUPER_ADMIN: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'The last active Super Admin cannot be disabled or unassigned.',
    },
    LAST_BRANCH_ADMIN: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'A branch must have an administrator before this account is disabled.',
    },
    BRANCH_ADMIN_REQUIRED: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Transfer this branch administrator role before disabling or removing it.',
    },
    BRANCH_SCOPE_REQUIRED: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Assign exactly one branch before assigning this staff role.',
    },
    BRANCH_ADMIN_EXISTS: {
      code: ErrorCodes.VALIDATION_ERROR,
      message:
        'This branch already has an administrator. Assign an active account to transfer the role.',
    },
    BRANCH_ADMIN_MUST_BE_ACTIVE: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Only an active staff account can administer a branch.',
    },
    BRANCH_ADMIN_PERMISSIONS_REQUIRED: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'A branch administrator must retain permission to manage branch users.',
    },
    BRANCH_ADMIN_OTHER_BRANCH: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'A staff user can administer only one branch.',
    },
    PERMISSION_GRANT_DENIED: {
      code: ErrorCodes.AUTH_PERMISSION_DENIED,
      message: 'You can grant only permissions that you currently hold.',
    },
    PERMISSION_NOT_FOUND: {
      code: ErrorCodes.NOT_FOUND,
      message: 'One or more selected permissions are not registered.',
    },
    PERMISSION_DUPLICATE: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'A permission was selected more than once.',
    },
    SELF_PERMISSION_CHANGE: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'You cannot change your own permissions.',
    },
    BRANCH_ADMIN_TRANSFER_REQUIRED: {
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'Transfer the branch administrator assignment before changing its branch.',
    },
    SUPER_ADMIN_BRANCH_SCOPE: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Super Admin accounts use global access and cannot be assigned to a branch.',
    },
    ONE_BRANCH_REQUIRED: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Every non-Super-Admin staff account must be assigned to exactly one branch.',
    },
    STATUS_UNCHANGED: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'The account already has this status.',
    },
    ROLE_NOT_ASSIGNED: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'This role is not currently assigned.',
    },
    DATABASE_REQUIRED: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Staff account management requires the database.',
    },
    AUTH_PRINCIPAL_REQUIRED: {
      code: ErrorCodes.AUTH_UNAUTHENTICATED,
      message: 'Authentication is required.',
    },
  };
  const detail = map[reason] ?? {
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'Staff account change failed.',
  };
  return { error: { ...detail, requestId: requestId() } };
}

@Controller({ path: 'admin' })
export class AdminUserController {
  constructor(@Inject(AdminUserService) private readonly users: AdminUserService) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.read')
  @Get('users')
  async listUsers(@Req() req: StaffRequest): Promise<unknown> {
    const principal = requirePrincipal(req);
    const rows = await this.users.listStaff(
      50,
      principal.branchIds ?? new Set<string>(),
      principal.isSuperAdmin,
    );
    return { data: rows, meta: { requestId: requestId() } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.read')
  @Get('roles')
  async listRoles(): Promise<unknown> {
    const rows = await this.users.listRoles();
    return { data: rows, meta: { requestId: requestId() } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.read')
  @Get('permissions')
  async listPermissions(@Req() req: StaffRequest): Promise<unknown> {
    const principal = requirePrincipal(req);
    const rows = await this.users.listPermissions(
      principal.isSuperAdmin || principal.permissions.has(adminPagePermission('roles', 'view'))
        ? undefined
        : principal.permissions,
    );
    return { data: rows, meta: { requestId: requestId() } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Post('users')
  @HttpCode(201)
  async createStaff(@Body() body: unknown, @Req() req: StaffRequest): Promise<unknown> {
    const parsed = safeValidate(createStaffSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      const principal = requirePrincipal(req);
      const result = await this.users.createStaff({
        ...parsed.data,
        actorUserId: principal.id,
        actorBranchIds: principal.branchIds,
        actorIsSuperAdmin: principal.isSuperAdmin,
      });
      return { data: result, meta: { requestId: requestId() } };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Patch('users/:userId')
  @HttpCode(200)
  async updateUser(
    @Param('userId') userId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(displayNameSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      await this.assertTargetScope(userId, req);
      await this.users.updateDisplayName(userId, parsed.data.displayName, requirePrincipal(req).id);
      return { data: { ok: true, userId }, meta: { requestId: requestId() } };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Patch('users/:userId/password')
  @HttpCode(200)
  async setPassword(
    @Param('userId') userId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(setPasswordSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      await this.assertTargetScope(userId, req);
      const status = await this.users.setStaffPassword(
        userId,
        parsed.data.password,
        requirePrincipal(req).id,
      );
      return { data: { ok: true, userId, status }, meta: { requestId: requestId() } };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Post('users/:userId/email-change')
  @HttpCode(201)
  async requestEmailChange(
    @Param('userId') userId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(emailSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      await this.assertTargetScope(userId, req);
      const result = await this.users.requestEmailChange(
        userId,
        parsed.data.email,
        requirePrincipal(req).id,
      );
      return { data: result, meta: { requestId: requestId() } };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Patch('users/:userId/status')
  @HttpCode(200)
  async updateStatus(
    @Param('userId') userId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(statusSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      await this.assertTargetScope(userId, req);
      await this.users.setAccountStatus(userId, parsed.data.status, requirePrincipal(req).id);
      return {
        data: { ok: true, userId, status: parsed.data.status },
        meta: { requestId: requestId() },
      };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Patch('users/:userId/branches')
  @HttpCode(200)
  async updateBranches(
    @Param('userId') userId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(branchesSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      await this.assertTargetScope(userId, req, false);
      const principal = requirePrincipal(req);
      await this.users.replaceBranchScopes(
        userId,
        parsed.data.branchIds,
        principal.id,
        principal.branchIds,
        principal.isSuperAdmin,
      );
      return {
        data: { ok: true, userId, branchIds: [...new Set(parsed.data.branchIds)] },
        meta: { requestId: requestId() },
      };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Patch('users/:userId/permissions')
  @HttpCode(200)
  async updatePermissions(
    @Param('userId') userId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(permissionsSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      await this.assertTargetScope(userId, req);
      const principal = requirePrincipal(req);
      await this.users.replacePermissionGrants({
        userId,
        ...parsed.data,
        actorUserId: principal.id,
        actorBranchIds: principal.branchIds,
        actorIsSuperAdmin: principal.isSuperAdmin,
      });
      return { data: { ok: true, userId }, meta: { requestId: requestId() } };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Post('users/:userId/roles')
  @HttpCode(201)
  async assignRole(
    @Param('userId') userId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(roleSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    try {
      await this.assertTargetScope(userId, req);
      await this.users.assignRole(userId, parsed.data.roleId, requirePrincipal(req).id);
      return {
        data: { ok: true, userId, roleId: parsed.data.roleId },
        meta: { requestId: requestId() },
      };
    } catch (error) {
      return serviceError(error);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('users.write')
  @Delete('users/:userId/roles/:roleId')
  @HttpCode(200)
  async revokeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Req() req: StaffRequest,
  ): Promise<unknown> {
    try {
      await this.assertTargetScope(userId, req);
      await this.users.revokeRole(userId, roleId, requirePrincipal(req).id);
      return { data: { ok: true, userId, roleId }, meta: { requestId: requestId() } };
    } catch (error) {
      return serviceError(error);
    }
  }

  async assertTargetScope(userId: string, req: StaffRequest, requireAll = true): Promise<void> {
    if (req.principal?.isSuperAdmin) return;
    if (!(await this.users.hasBranchAccess(userId, req.principal?.branchIds, requireAll))) {
      throw new Error('BRANCH_SCOPE_DENIED');
    }
  }
}
