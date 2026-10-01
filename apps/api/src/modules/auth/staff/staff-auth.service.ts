import { ActorType } from '@fastfood/domain-types';
import { expandAdminPagePermissions } from '@fastfood/domain-types';
import { Inject, Injectable, Optional } from '@nestjs/common';

import type { Prisma } from '../../../../prisma/generated/client/client.js';
import { scryptPasswordHasher } from '../../../common/crypto/password-hasher.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshTokenShape,
} from '../../../common/crypto/refresh-token.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

import { signStaffAccessToken, verifyStaffAccessToken } from './staff-access-token.js';

interface StaffSessionRecord {
  sessionId: string;
  refreshTokenHash: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
}

interface StaffUserRecord {
  userId: string;
  identifier: string;
  passwordHash: string;
}

@Injectable()
export class StaffAuthService {
  readonly #users = new Map<string, StaffUserRecord>();
  readonly #sessions = new Map<string, StaffSessionRecord>();
  readonly #mfaBypassEnabled: boolean;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {
    this.#mfaBypassEnabled =
      process.env['NODE_ENV'] !== 'production' && process.env['ALLOW_DEV_MFA_BYPASS'] === 'true';
  }

  async registerDevStaff(identifier: string, plain: string): Promise<string> {
    const passwordHash = await scryptPasswordHasher.hash(plain);
    if (!this.prisma) {
      const userId = `01900000-0000-7000-8000-${identifier.replace(/\D/g, '').padStart(12, '0').slice(0, 12)}`;
      this.#users.set(identifier, { userId, identifier, passwordHash });
      return userId;
    }
    const existing = await this.prisma.user.findUnique({
      where: { primaryIdentifier: identifier },
    });
    if (existing) {
      await this.prisma.staffProfile.upsert({
        where: { userId: existing.id },
        create: {
          userId: existing.id,
          passwordHash,
          passwordAlgo: 'scrypt',
          passwordUpdatedAt: new Date(),
        },
        update: {
          passwordHash,
          passwordAlgo: 'scrypt',
          passwordUpdatedAt: new Date(),
        },
      });
      return existing.id;
    }
    const user = await this.prisma.user.create({
      data: {
        actorType: 'STAFF',
        status: 'ACTIVE',
        primaryIdentifier: identifier,
        primaryIdentifierType: 'EMAIL',
        displayName: identifier.split('@')[0] ?? identifier,
        staffProfile: {
          create: {
            passwordHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
        },
      },
    });
    return user.id;
  }

  async confirmEmailChange(token: string): Promise<{ userId: string } | null> {
    if (!this.prisma) return null;
    const challenge = await this.prisma.emailVerificationChallenge.findUnique({
      where: { tokenHash: hashRefreshToken(token) },
    });
    const now = new Date();
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) return null;
    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: challenge.userId } });
        if (!user || user.actorType !== 'STAFF' || user.status !== 'ACTIVE') return null;
        const [existing, existingIdentity] = await Promise.all([
          tx.user.findUnique({
            where: { primaryIdentifier: challenge.emailNormalized },
            select: { id: true },
          }),
          tx.authIdentity.findUnique({
            where: {
              provider_providerSubject: {
                provider: 'EMAIL_PASSWORD',
                providerSubject: challenge.emailNormalized,
              },
            },
            select: { userId: true },
          }),
        ]);
        if (
          (existing && existing.id !== user.id) ||
          (existingIdentity && existingIdentity.userId !== user.id)
        )
          return null;
        const consumed = await tx.emailVerificationChallenge.updateMany({
          where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) return null;
        const priorEmail = user.primaryIdentifier;
        await tx.user.update({
          where: { id: user.id },
          data: { primaryIdentifier: challenge.emailNormalized, primaryIdentifierType: 'EMAIL' },
        });
        await tx.authIdentity.upsert({
          where: {
            provider_providerSubject: {
              provider: 'EMAIL_PASSWORD',
              providerSubject: challenge.emailNormalized,
            },
          },
          create: {
            userId: user.id,
            provider: 'EMAIL_PASSWORD',
            providerSubject: challenge.emailNormalized,
            emailNormalized: challenge.emailNormalized,
            emailVerifiedByProvider: true,
          },
          update: {
            userId: user.id,
            emailNormalized: challenge.emailNormalized,
            emailVerifiedByProvider: true,
          },
        });
        if (priorEmail && priorEmail !== challenge.emailNormalized)
          await tx.authIdentity.deleteMany({
            where: { userId: user.id, provider: 'EMAIL_PASSWORD', providerSubject: priorEmail },
          });
        await this.#writeAudit(tx, {
          actorUserId: user.id,
          action: 'staff.email.changed',
          resourceId: user.id,
          priorValues: { email: priorEmail },
          newValues: { email: challenge.emailNormalized },
        });
        return { userId: user.id };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async login(
    identifier: string,
    plain: string,
  ): Promise<
    | {
        ok: true;
        userId: string;
        refreshToken: string;
        refreshExpiresAt: Date;
        mfaRequired: boolean;
      }
    | { ok: false; reason: 'USER_NOT_FOUND' | 'PASSWORD_MISMATCH' }
  > {
    let userId: string;
    let passwordHash: string;
    if (!this.prisma) {
      const user = this.#users.get(identifier);
      if (!user) {
        return { ok: false, reason: 'USER_NOT_FOUND' };
      }
      userId = user.userId;
      passwordHash = user.passwordHash;
    } else {
      const row = await this.prisma.user.findUnique({
        where: { primaryIdentifier: identifier },
        include: { staffProfile: true },
      });
      if (
        !row ||
        (row.actorType !== 'STAFF' && row.actorType !== 'COURIER') ||
        row.status !== 'ACTIVE' ||
        !row.staffProfile?.passwordHash
      ) {
        return { ok: false, reason: 'USER_NOT_FOUND' };
      }
      if (row.actorType === 'COURIER') {
        const courier = await this.prisma.courierProfile.findUnique({
          where: { userId: row.id },
          select: { isActive: true },
        });
        if (!courier?.isActive) return { ok: false, reason: 'USER_NOT_FOUND' };
      }
      userId = row.id;
      passwordHash = row.staffProfile.passwordHash;
    }
    const ok = await scryptPasswordHasher.verify(plain, passwordHash);
    if (!ok) {
      return { ok: false, reason: 'PASSWORD_MISMATCH' };
    }
    const familyId = crypto.randomUUID();
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const refreshTokenHash = hashRefreshToken(refreshToken);
    if (!this.prisma) {
      this.#sessions.set(familyId, {
        sessionId: familyId,
        refreshTokenHash,
        familyId,
        userId,
        expiresAt: refreshExpiresAt,
      });
    } else {
      const session = await this.prisma.session.create({
        data: {
          userId,
          refreshTokenHash,
          familyId,
          expiresAt: refreshExpiresAt,
        },
      });
      this.#sessions.set(familyId, {
        sessionId: session.id,
        refreshTokenHash,
        familyId,
        userId,
        expiresAt: refreshExpiresAt,
      });
    }
    return {
      ok: true,
      userId,
      refreshToken,
      refreshExpiresAt,
      mfaRequired: !this.#mfaBypassEnabled,
    };
  }

  async verifyMfa(
    refreshToken: string,
    totp: string,
  ): Promise<{ ok: true; userId: string; accessToken: string } | { ok: false; reason: string }> {
    if (!verifyRefreshTokenShape(refreshToken)) {
      return { ok: false, reason: 'TOKEN_MALFORMED' };
    }
    const tokenHash = hashRefreshToken(refreshToken);
    let foundEntry: StaffSessionRecord | null = null;
    if (!this.prisma) {
      for (const entry of this.#sessions.values()) {
        if (entry.refreshTokenHash === tokenHash) {
          foundEntry = entry;
          break;
        }
      }
    } else {
      const row = await this.prisma.session.findUnique({
        where: { refreshTokenHash: tokenHash },
      });
      if (row && !row.revokedAt) {
        foundEntry = {
          sessionId: row.id,
          refreshTokenHash: row.refreshTokenHash,
          familyId: row.familyId,
          userId: row.userId,
          expiresAt: row.expiresAt,
        };
      }
    }
    if (!foundEntry) {
      return { ok: false, reason: 'TOKEN_NOT_FOUND' };
    }
    if (!/^\d{6}$/.test(totp)) {
      return { ok: false, reason: 'TOTP_MALFORMED' };
    }
    if (!this.#mfaBypassEnabled) {
      return { ok: false, reason: 'MFA_NOT_VERIFIED' };
    }
    const actorType = this.prisma
      ? (await this.prisma.user.findUnique({
          where: { id: foundEntry.userId },
          select: { actorType: true },
        }))?.actorType
      : 'STAFF';
    if (actorType !== 'STAFF' && actorType !== 'COURIER') {
      return { ok: false, reason: 'TOKEN_NOT_FOUND' };
    }
    if (actorType === 'COURIER' && this.prisma) {
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: foundEntry.userId },
        select: { isActive: true },
      });
      if (!courier?.isActive) return { ok: false, reason: 'TOKEN_NOT_FOUND' };
    }
    const accessToken =
      process.env['NODE_ENV'] === 'test'
        ? `staff-${foundEntry.userId}-${Date.now()}`
        : signStaffAccessToken({
            userId: foundEntry.userId,
            sessionId: foundEntry.sessionId,
            actorType,
          });
    return { ok: true, userId: foundEntry.userId, accessToken };
  }

  async refresh(
    refreshToken: string,
  ): Promise<
    | {
        ok: true;
        userId: string;
        accessToken: string;
        refreshToken: string;
        refreshExpiresAt: Date;
      }
    | { ok: false; reason: 'TOKEN_MALFORMED' | 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' }
  > {
    if (!verifyRefreshTokenShape(refreshToken)) {
      return { ok: false, reason: 'TOKEN_MALFORMED' };
    }
    if (!this.prisma) {
      const tokenHash = hashRefreshToken(refreshToken);
      const entry = [...this.#sessions.entries()].find(
        ([, candidate]) => candidate.refreshTokenHash === tokenHash,
      );
      if (!entry) return { ok: false, reason: 'TOKEN_NOT_FOUND' };
      const [sessionKey, previous] = entry;
      if (previous.expiresAt <= new Date()) {
        this.#sessions.delete(sessionKey);
        return { ok: false, reason: 'TOKEN_EXPIRED' };
      }
      this.#sessions.delete(sessionKey);
      const nextRefreshToken = generateRefreshToken();
      const nextExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const nextSessionId = crypto.randomUUID();
      this.#sessions.set(nextSessionId, {
        sessionId: nextSessionId,
        refreshTokenHash: hashRefreshToken(nextRefreshToken),
        familyId: previous.familyId,
        userId: previous.userId,
        expiresAt: nextExpiresAt,
      });
      const accessToken =
        process.env['NODE_ENV'] === 'test'
          ? `staff-${previous.userId}-${Date.now()}`
          : signStaffAccessToken({ userId: previous.userId, sessionId: nextSessionId });
      return {
        ok: true,
        userId: previous.userId,
        accessToken,
        refreshToken: nextRefreshToken,
        refreshExpiresAt: nextExpiresAt,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const tokenHash = hashRefreshToken(refreshToken);
      const previous = await tx.session.findUnique({ where: { refreshTokenHash: tokenHash } });
      if (!previous || previous.revokedAt) return { ok: false as const, reason: 'TOKEN_NOT_FOUND' as const };
      if (previous.expiresAt <= now) {
        await tx.session.update({
          where: { id: previous.id },
          data: { revokedAt: now, revokedReason: 'EXPIRED' },
        });
        return { ok: false as const, reason: 'TOKEN_EXPIRED' as const };
      }
      const user = await tx.user.findUnique({
        where: { id: previous.userId },
        select: { actorType: true, status: true },
      });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        (user.actorType !== 'STAFF' && user.actorType !== 'COURIER')
      ) {
        return { ok: false as const, reason: 'TOKEN_NOT_FOUND' as const };
      }
      if (user.actorType === 'COURIER') {
        const courier = await tx.courierProfile.findUnique({
          where: { userId: previous.userId },
          select: { isActive: true },
        });
        if (!courier?.isActive) return { ok: false as const, reason: 'TOKEN_NOT_FOUND' as const };
      }
      const revoked = await tx.session.updateMany({
        where: { id: previous.id, revokedAt: null, refreshTokenHash: tokenHash },
        data: { revokedAt: now, revokedReason: 'ROTATED' },
      });
      if (revoked.count !== 1) return { ok: false as const, reason: 'TOKEN_NOT_FOUND' as const };

      const nextRefreshToken = generateRefreshToken();
      const nextExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const nextSession = await tx.session.create({
        data: {
          userId: previous.userId,
          refreshTokenHash: hashRefreshToken(nextRefreshToken),
          familyId: previous.familyId,
          expiresAt: nextExpiresAt,
        },
      });
      const accessToken =
        process.env['NODE_ENV'] === 'test'
          ? `staff-${previous.userId}-${Date.now()}`
          : signStaffAccessToken({
              userId: previous.userId,
              sessionId: nextSession.id,
              actorType: user.actorType,
            });
      return {
        ok: true as const,
        userId: previous.userId,
        accessToken,
        refreshToken: nextRefreshToken,
        refreshExpiresAt: nextExpiresAt,
      };
    });
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    if (!verifyRefreshTokenShape(refreshToken)) return { ok: true };
    const tokenHash = hashRefreshToken(refreshToken);
    if (!this.prisma) {
      for (const [key, session] of this.#sessions) {
        if (session.refreshTokenHash === tokenHash) this.#sessions.delete(key);
      }
      return { ok: true };
    }
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
    });
    return { ok: true };
  }

  async resolveAccessToken(token: string): Promise<{
    id: string;
    actorType: ActorType;
    status: 'ACTIVE';
    permissions: ReadonlySet<string>;
    branchIds?: ReadonlySet<string>;
    isSuperAdmin: boolean;
    courierId?: string;
    sessionId?: string;
  } | null> {
    if (process.env['NODE_ENV'] === 'test') {
      const testMatch = /^staff-([0-9a-f-]{36})-\d+$/i.exec(token);
      if (testMatch?.[1]) {
        return {
          id: testMatch[1],
          actorType: ActorType.STAFF,
          status: 'ACTIVE',
          isSuperAdmin: false,
          permissions: new Set([
            'users.read',
            'users.write',
            'branches.read',
            'branches.write',
            'orders.read',
            'orders.update_status',
            'orders.reassign_branch',
            'catalog.products.read',
            'catalog.products.write',
            'catalog.prices.write',
            'payments.read',
            'payments.refund',
            'reports.read',
            'audit.read',
            'settings.read',
            'settings.write',
          ]),
        };
      }
    }

    const claims = verifyStaffAccessToken(token);
    if (!claims || !this.prisma) return null;
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { id: claims.sid },
      include: {
        user: {
          include: {
            userRoles: {
              where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              include: {
                role: { include: { rolePermissions: { include: { permission: true } } } },
              },
            },
            userPermissionGrants: { include: { permission: true } },
            userBranchScopes: true,
            branchAdministrator: { select: { branchId: true, userId: true } },
          },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.userId !== claims.sub ||
      session.user.actorType !== claims.actorType ||
      session.user.status !== 'ACTIVE'
    ) {
      return null;
    }
    const actorType = session.user.actorType;
    if (actorType === 'COURIER') {
      if (session.user.userBranchScopes.length || session.user.branchAdministrator) return null;
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true, isActive: true },
      });
      if (!courier?.isActive) return null;
      const permissions = expandAdminPagePermissions(
        session.user.customPermissionsEnabled
          ? session.user.userPermissionGrants.map((grant) => grant.permission.code)
          : session.user.userRoles.flatMap((entry) =>
              entry.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
            ),
      );
      return {
        id: session.user.id,
        actorType: ActorType.COURIER,
        status: 'ACTIVE',
        permissions,
        isSuperAdmin: false,
        courierId: courier.id,
        sessionId: session.id,
      };
    }
    const roleCodes = session.user.userRoles.map((entry) => entry.role.code);
    const isSuperAdmin = roleCodes.includes('SUPER_ADMIN');
    const isBranchAdmin = roleCodes.includes('BRANCH_ADMIN');
    if (
      (isSuperAdmin && session.user.userBranchScopes.length !== 0) ||
      (!isSuperAdmin && session.user.userBranchScopes.length !== 1) ||
      isBranchAdmin !== Boolean(session.user.branchAdministrator) ||
      (session.user.branchAdministrator &&
        (isSuperAdmin ||
          session.user.branchAdministrator.userId !== session.userId ||
          session.user.userBranchScopes[0]?.branchId !== session.user.branchAdministrator.branchId))
    )
      return null;
    const permissions = expandAdminPagePermissions(
      session.user.customPermissionsEnabled
        ? session.user.userPermissionGrants.map((grant) => grant.permission.code)
        : session.user.userRoles.flatMap((entry) =>
            entry.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
          ),
    );
    const branchIds = new Set(
      isSuperAdmin ? [] : session.user.userBranchScopes.map((scope) => scope.branchId),
    );
    return {
      id: session.user.id,
      actorType: ActorType.STAFF,
      status: 'ACTIVE',
      permissions,
      branchIds,
      isSuperAdmin,
      sessionId: session.id,
    };
  }

  async #writeAudit(
    tx: Prisma.TransactionClient,
    input: {
      actorUserId: string;
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
}
