import { Inject, Injectable, Optional } from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { scryptPasswordHasher } from '../../common/crypto/password-hasher.js';
import { generateRefreshToken, hashRefreshToken } from '../../common/crypto/refresh-token.js';
import { PrismaService } from '../../common/database/prisma.service.js';

export interface AdminUserListItem {
  id: string;
  actorType: string;
  status: string;
  displayName: string | null;
  primaryIdentifier: string | null;
  roleCodes: string[];
  permissionCodes: string[];
  customPermissionsEnabled: boolean;
  isBranchAdministrator: boolean;
  branchScopes?: { branchId: string; branchCode: string; branchName: string; scopeKind: string }[];
}

export interface EmailVerificationLinkResult {
  userId: string;
  token: string;
  expiresAt: string;
}

@Injectable()
export class AdminUserService {
  readonly #users: AdminUserListItem[] = [];

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {
    if (!this.prisma) {
      this.#users.push({
        id: '01900000-0000-7000-8000-000000000001',
        actorType: 'STAFF',
        status: 'ACTIVE',
        displayName: 'Dev Admin',
        primaryIdentifier: 'admin@fastfood.local',
        roleCodes: ['SUPER_ADMIN'],
        permissionCodes: [],
        customPermissionsEnabled: false,
        isBranchAdministrator: false,
      });
    }
  }

  async listStaff(
    limit = 50,
    branchScopeIds?: ReadonlySet<string>,
    isSuperAdmin = false,
  ): Promise<AdminUserListItem[]> {
    if (!this.prisma) {
      return this.#users
        .filter(
          (user) =>
            !branchScopeIds ||
            user.branchScopes?.some((scope) => branchScopeIds.has(scope.branchId)),
        )
        .slice(0, limit);
    }
    if (!isSuperAdmin && branchScopeIds && branchScopeIds.size === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: {
        actorType: 'STAFF',
        ...(!isSuperAdmin && branchScopeIds
          ? { userBranchScopes: { some: { branchId: { in: [...branchScopeIds] } } } }
          : {}),
      },
      include: {
        userRoles: {
          where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
        userBranchScopes: true,
        userPermissionGrants: { include: { permission: true } },
        branchAdministrator: { select: { branchId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const branchIds = [
      ...new Set(rows.flatMap((user) => user.userBranchScopes.map((scope) => scope.branchId))),
    ];
    const branches = branchIds.length
      ? await this.prisma.branch.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const branchById = new Map(branches.map((branch) => [branch.id, branch]));
    return rows.map((u) => ({
      id: u.id,
      actorType: u.actorType,
      status: u.status,
      displayName: u.displayName,
      primaryIdentifier: u.primaryIdentifier,
      roleCodes: u.userRoles.map((ur) => ur.role.code),
      permissionCodes: u.customPermissionsEnabled
        ? u.userPermissionGrants.map((grant) => grant.permission.code).sort()
        : [
            ...new Set(
              u.userRoles.flatMap((entry) =>
                entry.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
              ),
            ),
          ].sort(),
      customPermissionsEnabled: u.customPermissionsEnabled,
      isBranchAdministrator: Boolean(u.branchAdministrator),
      branchScopes: u.userBranchScopes.flatMap((scope) => {
        if (branchScopeIds && !branchScopeIds.has(scope.branchId)) return [];
        const branch = branchById.get(scope.branchId);
        return branch
          ? [
              {
                branchId: branch.id,
                branchCode: branch.code,
                branchName: branch.name,
                scopeKind: scope.scopeKind,
              },
            ]
          : [];
      }),
    }));
  }

  async hasBranchAccess(
    userId: string,
    branchScopeIds?: ReadonlySet<string>,
    requireAll = false,
  ): Promise<boolean> {
    if (!this.prisma) {
      const scopes = this.#users.find((user) => user.id === userId)?.branchScopes ?? [];
      if (!branchScopeIds?.size) return false;
      return (
        scopes.length > 0 &&
        (requireAll
          ? scopes.every((scope) => branchScopeIds.has(scope.branchId))
          : scopes.some((scope) => branchScopeIds.has(scope.branchId)))
      );
    }
    if (!branchScopeIds?.size) return false;
    const scopes = await this.prisma.userBranchScope.findMany({
      where: { userId },
      select: { branchId: true },
    });
    return (
      scopes.length > 0 &&
      (requireAll
        ? scopes.every((scope) => branchScopeIds.has(scope.branchId))
        : scopes.some((scope) => branchScopeIds.has(scope.branchId)))
    );
  }

  async listRoles(): Promise<
    {
      id: string;
      code: string;
      name: string;
      description: string | null;
      permissionCodes: string[] | null;
    }[]
  > {
    if (!this.prisma) {
      return [
        {
          id: 'role-1',
          code: 'SUPER_ADMIN',
          name: 'Super Admin',
          description: null,
          permissionCodes: null,
        },
      ];
    }
    const rows = await this.prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      permissionCodes: r.rolePermissions.map((entry) => entry.permission.code).sort(),
    }));
  }

  async listPermissions(
    grantableCodes?: ReadonlySet<string>,
  ): Promise<{ id: string; code: string; description: string | null }[]> {
    if (!this.prisma) {
      return [
        { id: 'perm-1', code: 'catalog.products.read', description: null },
        { id: 'perm-2', code: 'orders.read', description: null },
      ];
    }
    const rows = await this.prisma.permission.findMany({
      where: grantableCodes ? { code: { in: [...grantableCodes] } } : undefined,
      orderBy: { code: 'asc' },
    });
    return rows.map((p) => ({
      id: p.id,
      code: p.code,
      description: p.description,
    }));
  }

  async assignRole(userId: string, roleId: string, actorUserId?: string): Promise<void> {
    if (!this.prisma) {
      const user = this.#users.find((u) => u.id === userId);
      const role = (await this.listRoles()).find((r) => r.id === roleId);
      if (!user || !role) {
        throw new Error('NOT_FOUND');
      }
      if (!user.roleCodes.includes(role.code)) {
        user.roleCodes.push(role.code);
      }
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { actorType: true, status: true, userBranchScopes: { select: { branchId: true } } },
      });
      const role = await tx.role.findUnique({ where: { id: roleId }, select: { code: true } });
      if (!user || user.actorType !== 'STAFF' || !role) throw new Error('NOT_FOUND');
      await this.#assertRoleGrantAuthority(tx, actorUserId, [role.code]);
      if (role.code === 'SUPER_ADMIN' && user.userBranchScopes.length > 0)
        throw new Error('SUPER_ADMIN_BRANCH_SCOPE');
      if (role.code === 'BRANCH_ADMIN') {
        if (user.status !== 'ACTIVE') throw new Error('BRANCH_ADMIN_MUST_BE_ACTIVE');
        if (user.userBranchScopes.length !== 1) throw new Error('BRANCH_SCOPE_REQUIRED');
      }
      const now = new Date();
      const existing = await tx.userRole.findUnique({
        where: { userId_roleId: { userId, roleId } },
      });
      if (existing && !existing.revokedAt && (!existing.expiresAt || existing.expiresAt > now)) {
        throw new Error('ALREADY_ASSIGNED');
      }
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        create: { userId, roleId, grantedByUserId: actorUserId },
        update: { grantedByUserId: actorUserId, grantedAt: now, expiresAt: null, revokedAt: null },
      });
      if (role.code === 'BRANCH_ADMIN') {
        const branchId = user.userBranchScopes[0]?.branchId;
        if (!branchId) throw new Error('BRANCH_SCOPE_REQUIRED');
        const targetPermissions = await tx.user.findUnique({
          where: { id: userId },
          select: { customPermissionsEnabled: true },
        });
        if (targetPermissions?.customPermissionsEnabled) {
          await tx.userPermissionGrant.deleteMany({ where: { userId } });
          await tx.user.update({
            where: { id: userId },
            data: { customPermissionsEnabled: false },
          });
          await this.#writeAudit(tx, {
            actorUserId,
            action: 'staff.branch_admin.permissions_reset_to_role',
            resourceId: userId,
            priorValues: { customPermissionsEnabled: true },
            newValues: { customPermissionsEnabled: false },
          });
        }
        const currentAdministrator = await tx.branchAdministrator.findUnique({
          where: { branchId },
          select: { userId: true },
        });
        const otherBranch = await tx.branchAdministrator.findUnique({
          where: { userId },
          select: { branchId: true },
        });
        if (otherBranch && otherBranch.branchId !== branchId)
          throw new Error('BRANCH_ADMIN_OTHER_BRANCH');
        if (currentAdministrator && currentAdministrator.userId !== userId) {
          const oldRole = await tx.role.findUnique({
            where: { code: 'BRANCH_ADMIN' },
            select: { id: true },
          });
          if (oldRole) {
            await tx.userRole.updateMany({
              where: { userId: currentAdministrator.userId, roleId: oldRole.id, revokedAt: null },
              data: { revokedAt: now },
            });
          }
          const oldUser = await tx.user.findUnique({
            where: { id: currentAdministrator.userId },
            select: { customPermissionsEnabled: true },
          });
          if (oldUser?.customPermissionsEnabled) {
            await tx.userPermissionGrant.deleteMany({
              where: { userId: currentAdministrator.userId },
            });
            await tx.user.update({
              where: { id: currentAdministrator.userId },
              data: { customPermissionsEnabled: false },
            });
          }
          await this.#writeAudit(tx, {
            actorUserId,
            action: 'staff.branch_admin.transferred_out',
            resourceId: currentAdministrator.userId,
            priorValues: { branchId },
          });
        }
        await tx.branchAdministrator.upsert({
          where: { branchId },
          create: { branchId, userId, assignedByUserId: actorUserId ?? userId },
          update: { userId, assignedByUserId: actorUserId ?? userId, updatedAt: now },
        });
        await tx.branch.update({ where: { id: branchId }, data: { isActive: true } });
      }
      await this.#writeAudit(tx, {
        actorUserId,
        action: 'staff.role.assigned',
        resourceId: userId,
        newValues: { roleId, roleCode: role.code },
      });
    });
  }

  async createStaff(input: {
    email: string;
    displayName: string;
    password: string;
    roleIds: string[];
    branchIds: string[];
    permissionCodes?: string[];
    actorUserId: string;
    actorBranchIds?: ReadonlySet<string>;
    actorIsSuperAdmin?: boolean;
  }): Promise<{ userId: string; status: 'ACTIVE' }> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    if (!input.roleIds.length) throw new Error('ROLE_REQUIRED');
    if (input.password.length < 12 || input.password.length > 256)
      throw new Error('PASSWORD_POLICY');
    const permissionCodes = [...new Set(input.permissionCodes ?? [])];
    if (permissionCodes.length !== (input.permissionCodes ?? []).length)
      throw new Error('PERMISSION_DUPLICATE');
    if (input.branchIds.length > 1) throw new Error('ONE_BRANCH_REQUIRED');
    if (
      !input.actorIsSuperAdmin &&
      (input.branchIds.length !== 1 ||
        input.actorBranchIds?.size !== 1 ||
        input.branchIds.some((id) => !input.actorBranchIds?.has(id)))
    )
      throw new Error('BRANCH_SCOPE_DENIED');
    const email = input.email.trim().toLocaleLowerCase('en-US');
    const passwordHash = await scryptPasswordHasher.hash(input.password);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const [roles, branches, existing, existingIdentity, permissions] = await Promise.all([
          tx.role.findMany({
            where: { id: { in: input.roleIds } },
            select: { id: true, code: true },
          }),
          tx.branch.findMany({
            where: { id: { in: input.branchIds } },
            select: { id: true, isActive: true },
          }),
          tx.user.findUnique({ where: { primaryIdentifier: email }, select: { id: true } }),
          tx.authIdentity.findUnique({
            where: {
              provider_providerSubject: { provider: 'EMAIL_PASSWORD', providerSubject: email },
            },
            select: { userId: true },
          }),
          tx.permission.findMany({
            where: { code: { in: permissionCodes } },
            select: { id: true, code: true },
          }),
        ]);
        if (existing || existingIdentity) throw new Error('IDENTIFIER_EXISTS');
        if (roles.length !== input.roleIds.length) throw new Error('ROLE_NOT_FOUND');
        if (branches.length !== input.branchIds.length) throw new Error('BRANCH_NOT_FOUND');
        if (permissions.length !== permissionCodes.length) throw new Error('PERMISSION_NOT_FOUND');
        const roleCodes = roles.map((role) => role.code);
        const superAdminRoleSelected = roleCodes.includes('SUPER_ADMIN');
        const branchAdminRoleSelected = roleCodes.length === 1 && roleCodes[0] === 'BRANCH_ADMIN';
        const branchAdminBranchId = branchAdminRoleSelected ? input.branchIds[0] : undefined;
        if (branchAdminRoleSelected && !branchAdminBranchId) throw new Error('ONE_BRANCH_REQUIRED');
        if (
          branches.some((branch) => !branch.isActive) &&
          !(input.actorIsSuperAdmin && branchAdminRoleSelected)
        ) {
          throw new Error('BRANCH_NOT_ACTIVE');
        }
        if (
          superAdminRoleSelected &&
          (input.branchIds.length > 0 || !input.actorIsSuperAdmin || roleCodes.length !== 1)
        )
          throw new Error('ROLE_GRANT_DENIED');
        if (!superAdminRoleSelected && input.branchIds.length !== 1)
          throw new Error('ONE_BRANCH_REQUIRED');
        if (branchAdminBranchId) {
          if (!input.actorIsSuperAdmin) throw new Error('ROLE_GRANT_DENIED');
          const assigned = await tx.branchAdministrator.findUnique({
            where: { branchId: branchAdminBranchId },
            select: { userId: true },
          });
          if (assigned) throw new Error('BRANCH_ADMIN_EXISTS');
        }
        await this.#assertRoleGrantAuthority(
          tx,
          input.actorUserId,
          roles.map((role) => role.code),
        );
        if (!input.actorIsSuperAdmin) {
          const grantable = await this.#getEffectivePermissionCodes(tx, input.actorUserId);
          if (permissionCodes.some((code) => !grantable.has(code)))
            throw new Error('PERMISSION_GRANT_DENIED');
        }
        if (roleCodes.includes('BRANCH_ADMIN') && input.permissionCodes !== undefined)
          this.#assertBranchAdminMinimumPermissions(permissionCodes);
        const user = await tx.user.create({
          data: {
            actorType: 'STAFF',
            status: 'ACTIVE',
            primaryIdentifier: email,
            primaryIdentifierType: 'EMAIL',
            displayName: input.displayName.trim(),
            customPermissionsEnabled: input.permissionCodes !== undefined,
            staffProfile: {
              create: {
                passwordHash,
                passwordAlgo: 'scrypt',
                passwordUpdatedAt: new Date(),
              },
            },
            authIdentities: {
              create: {
                provider: 'EMAIL_PASSWORD',
                providerSubject: email,
                emailNormalized: email,
              },
            },
            userRoles: {
              create: input.roleIds.map((roleId) => ({
                roleId,
                grantedByUserId: input.actorUserId,
              })),
            },
            userBranchScopes: {
              create: input.branchIds.map((branchId) => ({ branchId, scopeKind: 'assigned' })),
            },
            ...(input.permissionCodes !== undefined
              ? {
                  userPermissionGrants: {
                    create: permissions.map((permission) => ({
                      permissionId: permission.id,
                      grantedByUserId: input.actorUserId,
                    })),
                  },
                }
              : {}),
          },
        });
        if (branchAdminBranchId) {
          await tx.branchAdministrator.create({
            data: {
              branchId: branchAdminBranchId,
              userId: user.id,
              assignedByUserId: input.actorUserId,
            },
          });
          await tx.branch.update({ where: { id: branchAdminBranchId }, data: { isActive: true } });
        }
        await this.#writeAudit(tx, {
          actorUserId: input.actorUserId,
          action: 'staff.created',
          resourceId: user.id,
          newValues: {
            displayName: user.displayName,
            email,
            status: 'ACTIVE',
            passwordConfigured: true,
            roleIds: input.roleIds,
            branchIds: input.branchIds,
            permissionCodes: input.permissionCodes,
          },
        });
        return user.id;
      },
      { isolationLevel: 'Serializable' },
    );
    return { userId: result, status: 'ACTIVE' };
  }

  async setStaffPassword(
    userId: string,
    plainPassword: string,
    actorUserId: string,
  ): Promise<'ACTIVE' | 'DISABLED'> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    if (userId === actorUserId) throw new Error('SELF_PASSWORD_RESET');
    if (plainPassword.length < 12 || plainPassword.length > 256) throw new Error('PASSWORD_POLICY');
    const passwordHash = await scryptPasswordHasher.hash(plainPassword);
    const now = new Date();
    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            actorType: true,
            status: true,
            branchAdministrator: { select: { branchId: true } },
          },
        });
        if (!user || user.actorType !== 'STAFF') throw new Error('NOT_FOUND');
        const status =
          user.status === 'PENDING_VERIFICATION' || user.status === 'LOCKED'
            ? 'ACTIVE'
            : user.status;
        await tx.staffProfile.upsert({
          where: { userId },
          create: {
            userId,
            passwordHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: now,
          },
          update: { passwordHash, passwordAlgo: 'scrypt', passwordUpdatedAt: now },
        });
        if (user.status === 'PENDING_VERIFICATION') {
          await tx.emailVerificationChallenge.updateMany({
            where: { userId, consumedAt: null },
            data: { consumedAt: now },
          });
        }
        if (status !== user.status) {
          await tx.user.update({ where: { id: userId }, data: { status, disabledAt: null } });
        }
        if (user.status === 'PENDING_VERIFICATION' && user.branchAdministrator) {
          await tx.branch.update({
            where: { id: user.branchAdministrator.branchId },
            data: { isActive: true },
          });
        }
        const revoked = await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now, revokedReason: 'admin_password_reset' },
        });
        await this.#writeAudit(tx, {
          actorUserId,
          action: 'staff.password.reset',
          resourceId: userId,
          priorValues: { status: user.status },
          newValues: {
            status,
            passwordUpdatedAt: now.toISOString(),
            revokedSessionCount: revoked.count,
          },
        });
        return status;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async updateDisplayName(userId: string, displayName: string, actorUserId: string): Promise<void> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { actorType: true, displayName: true },
      });
      if (!user || user.actorType !== 'STAFF') throw new Error('NOT_FOUND');
      await tx.user.update({ where: { id: userId }, data: { displayName: displayName.trim() } });
      await this.#writeAudit(tx, {
        actorUserId,
        action: 'staff.profile.updated',
        resourceId: userId,
        priorValues: { displayName: user.displayName },
        newValues: { displayName: displayName.trim() },
      });
    });
  }

  async requestEmailChange(
    userId: string,
    nextEmailRaw: string,
    actorUserId: string,
  ): Promise<EmailVerificationLinkResult> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    const email = nextEmailRaw.trim().toLocaleLowerCase('en-US');
    const token = generateRefreshToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(
      async (tx) => {
        const [user, existing, existingIdentity] = await Promise.all([
          tx.user.findUnique({
            where: { id: userId },
            select: { actorType: true, status: true, primaryIdentifier: true },
          }),
          tx.user.findUnique({ where: { primaryIdentifier: email }, select: { id: true } }),
          tx.authIdentity.findUnique({
            where: {
              provider_providerSubject: { provider: 'EMAIL_PASSWORD', providerSubject: email },
            },
            select: { userId: true },
          }),
        ]);
        if (!user || user.actorType !== 'STAFF') throw new Error('NOT_FOUND');
        if (user.status !== 'ACTIVE') throw new Error('ACCOUNT_NOT_ACTIVE');
        if (existing && existing.id !== userId) throw new Error('IDENTIFIER_EXISTS');
        if (existingIdentity && existingIdentity.userId !== userId)
          throw new Error('IDENTIFIER_EXISTS');
        await tx.emailVerificationChallenge.updateMany({
          where: { userId, consumedAt: null },
          data: { consumedAt: now },
        });
        await tx.emailVerificationChallenge.create({
          data: { userId, emailNormalized: email, tokenHash: hashRefreshToken(token), expiresAt },
        });
        await this.#writeAudit(tx, {
          actorUserId,
          action: 'staff.email.change_requested',
          resourceId: userId,
          priorValues: { email: user.primaryIdentifier },
          newValues: { email },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    return { userId, token, expiresAt: expiresAt.toISOString() };
  }

  async setAccountStatus(
    userId: string,
    status: 'ACTIVE' | 'DISABLED',
    actorUserId: string,
  ): Promise<void> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    if (userId === actorUserId && status === 'DISABLED') throw new Error('SELF_DISABLE');
    const now = new Date();
    await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: {
            branchAdministrator: true,
            staffProfile: true,
            userRoles: {
              where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              include: { role: true },
            },
          },
        });
        if (!user || user.actorType !== 'STAFF') throw new Error('NOT_FOUND');
        if (status === 'ACTIVE' && !user.staffProfile?.passwordHash)
          throw new Error('ACCOUNT_PASSWORD_REQUIRED');
        if (user.status === status) throw new Error('STATUS_UNCHANGED');
        if (status === 'DISABLED' && user.branchAdministrator)
          throw new Error('BRANCH_ADMIN_REQUIRED');
        if (
          status === 'DISABLED' &&
          user.userRoles.some((entry) => entry.role.code === 'SUPER_ADMIN')
        ) {
          const activeAdmins = await tx.user.count({
            where: {
              actorType: 'STAFF',
              status: 'ACTIVE',
              userRoles: {
                some: {
                  role: { code: 'SUPER_ADMIN' },
                  revokedAt: null,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
          });
          if (activeAdmins <= 1) throw new Error('LAST_SUPER_ADMIN');
        }
        await tx.user.update({
          where: { id: userId },
          data: { status, disabledAt: status === 'DISABLED' ? now : null },
        });
        if (status === 'DISABLED') {
          await tx.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: now, revokedReason: 'admin_account_disabled' },
          });
        }
        await this.#writeAudit(tx, {
          actorUserId,
          action: status === 'DISABLED' ? 'staff.access.disabled' : 'staff.access.restored',
          resourceId: userId,
          priorValues: { status: user.status },
          newValues: { status },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async revokeRole(userId: string, roleId: string, actorUserId: string): Promise<void> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    if (userId === actorUserId) throw new Error('SELF_ROLE_CHANGE');
    await this.prisma.$transaction(
      async (tx) => {
        const role = await tx.role.findUnique({ where: { id: roleId }, select: { code: true } });
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { actorType: true, status: true },
        });
        if (!role || !user || user.actorType !== 'STAFF') throw new Error('NOT_FOUND');
        await this.#assertRoleGrantAuthority(tx, actorUserId, [role.code]);
        const assignment = await tx.userRole.findUnique({
          where: { userId_roleId: { userId, roleId } },
        });
        if (!assignment || assignment.revokedAt) throw new Error('ROLE_NOT_ASSIGNED');
        if (role.code === 'BRANCH_ADMIN') throw new Error('BRANCH_ADMIN_REQUIRED');
        if (role.code === 'SUPER_ADMIN' && user.status === 'ACTIVE') {
          const activeAdmins = await tx.user.count({
            where: {
              actorType: 'STAFF',
              status: 'ACTIVE',
              userRoles: {
                some: {
                  role: { code: 'SUPER_ADMIN' },
                  revokedAt: null,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
              },
            },
          });
          if (activeAdmins <= 1) throw new Error('LAST_SUPER_ADMIN');
        }
        await tx.userRole.update({
          where: { userId_roleId: { userId, roleId } },
          data: { revokedAt: new Date() },
        });
        await this.#writeAudit(tx, {
          actorUserId,
          action: 'staff.role.revoked',
          resourceId: userId,
          priorValues: { roleId, roleCode: role.code },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async replaceBranchScopes(
    userId: string,
    branchIds: string[],
    actorUserId: string,
    actorBranchIds?: ReadonlySet<string>,
    actorIsSuperAdmin = false,
  ): Promise<void> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    if (userId === actorUserId) throw new Error('SELF_SCOPE_CHANGE');
    const uniqueBranchIds = [...new Set(branchIds)];
    if (uniqueBranchIds.length > 1) throw new Error('ONE_BRANCH_REQUIRED');
    if (
      !actorIsSuperAdmin &&
      (!actorBranchIds ||
        actorBranchIds.size !== 1 ||
        uniqueBranchIds.some((id) => !actorBranchIds.has(id)))
    )
      throw new Error('BRANCH_SCOPE_DENIED');
    await this.prisma.$transaction(
      async (tx) => {
        const [user, branches, previous] = await Promise.all([
          tx.user.findUnique({
            where: { id: userId },
            select: {
              actorType: true,
              userRoles: {
                where: {
                  revokedAt: null,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
                select: { role: { select: { code: true } } },
              },
              branchAdministrator: { select: { branchId: true } },
            },
          }),
          tx.branch.findMany({
            where: { id: { in: uniqueBranchIds }, isActive: true },
            select: { id: true },
          }),
          tx.userBranchScope.findMany({ where: { userId }, select: { branchId: true } }),
        ]);
        if (!user || user.actorType !== 'STAFF') throw new Error('NOT_FOUND');
        const targetIsSuperAdmin = user.userRoles.some(
          (entry) => entry.role.code === 'SUPER_ADMIN',
        );
        if (targetIsSuperAdmin) {
          if (uniqueBranchIds.length) throw new Error('SUPER_ADMIN_BRANCH_SCOPE');
        } else if (uniqueBranchIds.length !== 1) {
          throw new Error('ONE_BRANCH_REQUIRED');
        }
        if (user.branchAdministrator && uniqueBranchIds[0] !== user.branchAdministrator.branchId)
          throw new Error('BRANCH_ADMIN_TRANSFER_REQUIRED');
        if (branches.length !== uniqueBranchIds.length) throw new Error('BRANCH_NOT_FOUND');
        const inScopeExistingIds = previous
          .filter((scope) => actorIsSuperAdmin || Boolean(actorBranchIds?.has(scope.branchId)))
          .map((scope) => scope.branchId);
        await tx.userBranchScope.deleteMany({
          where: { userId, ...(actorIsSuperAdmin ? {} : { branchId: { in: inScopeExistingIds } }) },
        });
        if (uniqueBranchIds.length) {
          await tx.userBranchScope.createMany({
            data: uniqueBranchIds.map((branchId) => ({ userId, branchId, scopeKind: 'assigned' })),
          });
        }
        await this.#writeAudit(tx, {
          actorUserId,
          action: 'staff.branch_scopes.replaced',
          resourceId: userId,
          priorValues: { branchIds: inScopeExistingIds },
          newValues: { branchIds: uniqueBranchIds },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async replacePermissionGrants(input: {
    userId: string;
    permissionCodes: string[];
    customPermissionsEnabled: boolean;
    actorUserId: string;
    actorBranchIds?: ReadonlySet<string>;
    actorIsSuperAdmin?: boolean;
  }): Promise<void> {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    if (input.userId === input.actorUserId) throw new Error('SELF_PERMISSION_CHANGE');
    const codes = [...new Set(input.permissionCodes)];
    if (codes.length !== input.permissionCodes.length) throw new Error('PERMISSION_DUPLICATE');
    if (!input.actorIsSuperAdmin && !input.actorBranchIds?.size)
      throw new Error('BRANCH_SCOPE_DENIED');

    await this.prisma.$transaction(
      async (tx) => {
        const [target, actor, permissions] = await Promise.all([
          tx.user.findUnique({
            where: { id: input.userId },
            include: {
              userRoles: {
                where: {
                  revokedAt: null,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
                include: {
                  role: {
                    select: {
                      code: true,
                      rolePermissions: { include: { permission: { select: { code: true } } } },
                    },
                  },
                },
              },
              userBranchScopes: { select: { branchId: true } },
              branchAdministrator: { select: { branchId: true } },
            },
          }),
          tx.user.findUnique({
            where: { id: input.actorUserId },
            include: {
              userRoles: {
                where: {
                  revokedAt: null,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
                include: {
                  role: { include: { rolePermissions: { include: { permission: true } } } },
                },
              },
              userPermissionGrants: { include: { permission: true } },
            },
          }),
          tx.permission.findMany({
            where: { code: { in: codes } },
            select: { id: true, code: true },
          }),
        ]);
        if (!target || target.actorType !== 'STAFF' || !actor || actor.status !== 'ACTIVE')
          throw new Error('NOT_FOUND');
        if (target.userRoles.some((entry) => entry.role.code === 'SUPER_ADMIN'))
          throw new Error('ROLE_GRANT_DENIED');
        if (target.branchAdministrator && !input.actorIsSuperAdmin)
          throw new Error('ROLE_GRANT_DENIED');
        const targetBranchIds = target.userBranchScopes.map((scope) => scope.branchId);
        if (
          !input.actorIsSuperAdmin &&
          (targetBranchIds.length !== 1 || !input.actorBranchIds?.has(targetBranchIds[0] ?? ''))
        )
          throw new Error('BRANCH_SCOPE_DENIED');
        if (permissions.length !== codes.length) throw new Error('PERMISSION_NOT_FOUND');

        const actorRoleCodes = actor.userRoles.map((entry) => entry.role.code);
        const actorIsSuperAdmin = actorRoleCodes.includes('SUPER_ADMIN');
        const grantableCodes = new Set(
          actor.customPermissionsEnabled
            ? actor.userPermissionGrants.map((grant) => grant.permission.code)
            : actor.userRoles.flatMap((entry) =>
                entry.role.rolePermissions.map((grant) => grant.permission.code),
              ),
        );
        const priorCodes = target.customPermissionsEnabled
          ? (
              await tx.userPermissionGrant.findMany({
                where: { userId: input.userId },
                include: { permission: true },
              })
            ).map((grant) => grant.permission.code)
          : target.userRoles.flatMap((entry) =>
              entry.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
            );
        const priorCodeSet = new Set(priorCodes);
        if (
          !input.actorIsSuperAdmin &&
          !actorIsSuperAdmin &&
          codes.some((code) => !grantableCodes.has(code) && !priorCodeSet.has(code))
        ) {
          throw new Error('PERMISSION_GRANT_DENIED');
        }
        if (target.branchAdministrator && input.customPermissionsEnabled)
          this.#assertBranchAdminMinimumPermissions(codes);
        await tx.userPermissionGrant.deleteMany({ where: { userId: input.userId } });
        if (input.customPermissionsEnabled && permissions.length) {
          await tx.userPermissionGrant.createMany({
            data: permissions.map((permission) => ({
              userId: input.userId,
              permissionId: permission.id,
              grantedByUserId: input.actorUserId,
            })),
          });
        }
        await tx.user.update({
          where: { id: input.userId },
          data: { customPermissionsEnabled: input.customPermissionsEnabled },
        });
        await this.#writeAudit(tx, {
          actorUserId: input.actorUserId,
          action: 'staff.permissions.replaced',
          resourceId: input.userId,
          priorValues: {
            customPermissionsEnabled: target.customPermissionsEnabled,
            permissionCodes: priorCodes,
          },
          newValues: {
            customPermissionsEnabled: input.customPermissionsEnabled,
            permissionCodes: input.customPermissionsEnabled ? codes : [],
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async #writeAudit(
    tx: Prisma.TransactionClient,
    input: {
      actorUserId?: string;
      action: string;
      resourceId: string;
      priorValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
    },
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorType: 'STAFF',
        action: input.action,
        resourceType: 'STAFF_USER',
        resourceId: input.resourceId,
        priorValuesJson: input.priorValues as Prisma.InputJsonValue | undefined,
        newValuesJson: input.newValues as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async #getEffectivePermissionCodes(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<Set<string>> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
        userPermissionGrants: { include: { permission: true } },
      },
    });
    if (!user) return new Set();
    return new Set(
      user.customPermissionsEnabled
        ? user.userPermissionGrants.map((grant) => grant.permission.code)
        : user.userRoles.flatMap((entry) =>
            entry.role.rolePermissions.map((grant) => grant.permission.code),
          ),
    );
  }

  #assertBranchAdminMinimumPermissions(codes: string[]): void {
    const minimum = [
      'users.read',
      'users.write',
      'admin.page.users.view',
      'admin.page.users.create',
      'admin.page.users.update',
    ];
    if (minimum.some((code) => !codes.includes(code)))
      throw new Error('BRANCH_ADMIN_PERMISSIONS_REQUIRED');
  }

  async #assertRoleGrantAuthority(
    tx: Prisma.TransactionClient,
    actorUserId: string | undefined,
    targetRoleCodes: string[],
  ): Promise<void> {
    if (!actorUserId) throw new Error('ROLE_GRANT_DENIED');
    const actorRoles = await tx.userRole.findMany({
      where: {
        userId: actorUserId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { role: { select: { code: true } } },
    });
    const codes = new Set(actorRoles.map((entry) => entry.role.code));
    if (codes.has('SUPER_ADMIN')) return;
    if (targetRoleCodes.some((code) => code === 'SUPER_ADMIN' || code === 'BRANCH_ADMIN'))
      throw new Error('ROLE_GRANT_DENIED');
    if (codes.has('BRANCH_ADMIN') && targetRoleCodes.every((code) => code === 'BRANCH_USER'))
      return;
    if (
      targetRoleCodes.every((code) => codes.has(code)) &&
      !targetRoleCodes.some((code) => code === 'SUPER_ADMIN')
    )
      return;
    throw new Error('ROLE_GRANT_DENIED');
  }
}
