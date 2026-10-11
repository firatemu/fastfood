import {
  ErrorCodes,
  normalizeCourierUsername,
  type AdminCourierCreateInput,
  type AdminCourierUpdateInput,
} from '@fastfood/contracts';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { scryptPasswordHasher } from '../../common/crypto/password-hasher.js';
import { PrismaService } from '../../common/database/prisma.service.js';

import { ACTIVE_DELIVERY_STATUSES } from './delivery-state-machine.js';

export interface CourierBranchRefDto {
  branchId: string;
  branchName: string;
  isPrimary: boolean;
}

export interface CourierAccountDto {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  phone: string | null;
  isActive: boolean;
  maxActiveDeliveries: number;
  branches: CourierBranchRefDto[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The staff member performing the change. `branchIds` is the actor's own
 * branch scope, which is what keeps a branch manager inside their branch: they
 * can see and edit only the couriers declared for it.
 */
export interface CourierAdminActor {
  userId: string;
  isSuperAdmin: boolean;
  branchIds: ReadonlySet<string>;
}

const COURIER_INCLUDE = {
  branchScopes: {
    include: { branch: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

type CourierRow = Prisma.CourierProfileGetPayload<{ include: typeof COURIER_INCLUDE }>;

/**
 * `courier_profiles.user_id` is a plain unique column rather than a declared
 * Prisma relation, so the login name lives on `users.primary_identifier` and
 * is joined here in memory. Two extra reads per roster render are cheaper than
 * migrating the column to a real foreign key, which would first have to
 * decide what to do with rows whose user was never created.
 */

/**
 * Courier account management (document 15 §delivery, document 29 §admin).
 *
 * Creating a courier provisions a real login account in one transaction —
 * `users` row, the scrypt credential, the operational profile and the branch
 * roster — because the operations team staffs a branch before the courier has
 * ever taken a job. Before this service the roster was inferred from delivery
 * history, which made a brand new courier invisible to the branch that hired
 * them; branch membership is now the explicit `courier_branches` record this
 * service owns.
 *
 * The credential lives on `staff_profiles` because that is where
 * `StaffAuthService.login` already reads the password from for an
 * `actor_type = COURIER` user. No new auth surface is introduced: a courier
 * created here can sign in through the existing login route with the username
 * and password chosen at creation time.
 */
@Injectable()
export class CourierAdminService {
  constructor(@Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null) {}

  #require(): PrismaService {
    if (!this.prisma) throw new Error('DATABASE_REQUIRED');
    return this.prisma;
  }

  async create(
    input: AdminCourierCreateInput,
    actor: CourierAdminActor,
  ): Promise<CourierAccountDto> {
    const prisma = this.#require();
    const username = normalizeCourierUsername(input.username);
    const displayName = input.displayName.trim();
    const branchIds = this.#assertBranchScope(input.branchIds, actor);
    // Hashing happens outside the transaction: scrypt is deliberately slow and
    // holding a Serializable transaction open across it would only add
    // lock-contention risk without changing the outcome.
    const passwordHash = await scryptPasswordHasher.hash(input.password);

    const courierId = await prisma.$transaction(
      async (tx) => {
        const [existingUser, existingIdentity, branches] = await Promise.all([
          tx.user.findUnique({
            where: { primaryIdentifier: username },
            select: { id: true },
          }),
          tx.authIdentity.findUnique({
            where: {
              provider_providerSubject: { provider: 'EMAIL_PASSWORD', providerSubject: username },
            },
            select: { userId: true },
          }),
          tx.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, isActive: true },
          }),
        ]);
        if (existingUser || existingIdentity) {
          throw new ConflictException({
            code: ErrorCodes.COURIER_USERNAME_TAKEN,
            message: 'This username is already taken.',
          });
        }
        if (branches.length !== branchIds.length) {
          throw new NotFoundException({
            code: ErrorCodes.NOT_FOUND,
            message: 'One or more branches do not exist.',
          });
        }
        if (branches.some((branch) => !branch.isActive)) {
          throw new BadRequestException({
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Couriers can only be declared for an active branch.',
          });
        }

        const user = await tx.user.create({
          data: {
            actorType: 'COURIER',
            status: 'ACTIVE',
            primaryIdentifier: username,
            primaryIdentifierType: 'COURIER_USERNAME',
            displayName,
            staffProfile: {
              create: {
                passwordHash,
                passwordAlgo: 'scrypt',
                passwordUpdatedAt: new Date(),
              },
            },
          },
        });
        const courier = await tx.courierProfile.create({
          data: {
            userId: user.id,
            displayName,
            phone: input.phone?.trim() || null,
            maxActiveDeliveries: input.maxActiveDeliveries ?? 3,
          },
        });
        await tx.courierBranch.createMany({
          data: branchIds.map((branchId, index) => ({
            courierId: courier.id,
            branchId,
            isPrimary: index === 0,
            assignedByUserId: actor.userId,
          })),
        });
        await this.#writeAudit(tx, {
          actorUserId: actor.userId,
          action: 'courier.created',
          resourceId: courier.id,
          newValues: {
            username,
            displayName,
            phone: input.phone?.trim() || null,
            maxActiveDeliveries: input.maxActiveDeliveries ?? 3,
            branchIds,
            passwordConfigured: true,
          },
        });
        return courier.id;
      },
      { isolationLevel: 'Serializable' },
    );

    return this.get(courierId);
  }

  /**
   * Roster read. `branchId` narrows to one branch when the caller asks for it;
   * a non-super-admin actor is always pinned to their own branch regardless of
   * what they asked for.
   */
  async list(branchId: string | undefined, actor: CourierAdminActor): Promise<CourierAccountDto[]> {
    const prisma = this.#require();
    const scope = this.#resolveReadScope(branchId, actor);
    const rows = await prisma.courierProfile.findMany({
      where: scope ? { branchScopes: { some: { branchId: scope } } } : undefined,
      include: COURIER_INCLUDE,
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    });
    const usernames = await this.#loadUsernames(rows.map((row) => row.userId));
    return rows.map((row) => this.#map(row, usernames));
  }

  async get(courierId: string): Promise<CourierAccountDto> {
    const prisma = this.#require();
    const row = await prisma.courierProfile.findUnique({
      where: { id: courierId },
      include: COURIER_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Courier not found.' });
    }
    return this.#map(row, await this.#loadUsernames([row.userId]));
  }

  async update(
    courierId: string,
    input: AdminCourierUpdateInput,
    actor: CourierAdminActor,
  ): Promise<CourierAccountDto> {
    const prisma = this.#require();
    const current = await this.#assertCanManage(courierId, actor);
    const displayName = input.displayName?.trim();
    const phone = input.phone === undefined ? undefined : input.phone?.trim() || null;
    const isActive = input.isActive;

    await prisma.$transaction(
      async (tx) => {
        await tx.courierProfile.update({
          where: { id: courierId },
          data: {
            ...(displayName === undefined ? {} : { displayName }),
            ...(phone === undefined ? {} : { phone }),
            ...(input.maxActiveDeliveries === undefined
              ? {}
              : { maxActiveDeliveries: input.maxActiveDeliveries }),
            ...(isActive === undefined ? {} : { isActive }),
          },
        });
        if (displayName !== undefined) {
          await tx.user.update({ where: { id: current.userId }, data: { displayName } });
        }
        // A courier whose profile is paused must also stop being able to sign
        // in, otherwise "Beklemede" would only be a label in the admin UI.
        if (isActive !== undefined) {
          await tx.user.update({
            where: { id: current.userId },
            data: {
              status: isActive ? 'ACTIVE' : 'DISABLED',
              disabledAt: isActive ? null : new Date(),
            },
          });
        }
        await this.#writeAudit(tx, {
          actorUserId: actor.userId,
          action: 'courier.updated',
          resourceId: courierId,
          priorValues: {
            displayName: current.displayName,
            phone: current.phone,
            maxActiveDeliveries: current.maxActiveDeliveries,
            isActive: current.isActive,
          },
          newValues: {
            ...(displayName === undefined ? {} : { displayName }),
            ...(phone === undefined ? {} : { phone }),
            ...(input.maxActiveDeliveries === undefined
              ? {}
              : { maxActiveDeliveries: input.maxActiveDeliveries }),
            ...(isActive === undefined ? {} : { isActive }),
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return this.get(courierId);
  }

  async setPassword(
    courierId: string,
    plainPassword: string,
    actor: CourierAdminActor,
  ): Promise<CourierAccountDto> {
    const prisma = this.#require();
    const current = await this.#assertCanManage(courierId, actor);
    const passwordHash = await scryptPasswordHasher.hash(plainPassword);

    await prisma.$transaction(
      async (tx) => {
        await tx.staffProfile.upsert({
          where: { userId: current.userId },
          create: {
            userId: current.userId,
            passwordHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
          update: { passwordHash, passwordAlgo: 'scrypt', passwordUpdatedAt: new Date() },
        });
        await this.#writeAudit(tx, {
          actorUserId: actor.userId,
          action: 'courier.password_reset',
          resourceId: courierId,
          newValues: { passwordConfigured: true },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return this.get(courierId);
  }

  /**
   * Replaces the branch roster wholesale — the submitted list *is* the new
   * roster, so an administrator can move a courier between branches without
   * a second call. A branch that still has unfinished deliveries for this
   * courier is refused rather than silently dropped.
   */
  async setBranches(
    courierId: string,
    branchIds: string[],
    actor: CourierAdminActor,
  ): Promise<CourierAccountDto> {
    const prisma = this.#require();
    const current = await this.#assertCanManage(courierId, actor);
    const next = this.#assertBranchScope(branchIds, actor);
    const removed = current.branchScopes
      .map((scope) => scope.branchId)
      .filter((branchId) => !next.includes(branchId));

    await prisma.$transaction(
      async (tx) => {
        if (removed.length) {
          const busy = await tx.delivery.findFirst({
            where: {
              branchId: { in: removed },
              courierId,
              status: { in: [...ACTIVE_DELIVERY_STATUSES] },
            },
            select: { id: true },
          });
          if (busy) {
            throw new ConflictException({
              code: ErrorCodes.COURIER_HAS_ACTIVE_DELIVERY,
              message: 'This courier still has an unfinished delivery for that branch.',
            });
          }
        }
        const branches = await tx.branch.findMany({
          where: { id: { in: next } },
          select: { id: true, isActive: true },
        });
        if (branches.length !== next.length) {
          throw new NotFoundException({
            code: ErrorCodes.NOT_FOUND,
            message: 'One or more branches do not exist.',
          });
        }
        if (branches.some((branch) => !branch.isActive)) {
          throw new BadRequestException({
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Couriers can only be declared for an active branch.',
          });
        }
        await tx.courierBranch.deleteMany({ where: { courierId } });
        if (next.length) {
          await tx.courierBranch.createMany({
            data: next.map((branchId, index) => ({
              courierId,
              branchId,
              isPrimary: index === 0,
              assignedByUserId: actor.userId,
            })),
          });
        }
        await this.#writeAudit(tx, {
          actorUserId: actor.userId,
          action: 'courier.branches_replaced',
          resourceId: courierId,
          priorValues: { branchIds: current.branchScopes.map((scope) => scope.branchId) },
          newValues: { branchIds: next },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return this.get(courierId);
  }

  /** Explicit membership only — never inferred from delivery history. */
  async isLinkedToBranch(courierId: string, branchId: string): Promise<boolean> {
    const prisma = this.#require();
    const row = await prisma.courierBranch.findUnique({
      where: { courierId_branchId: { courierId, branchId } },
      select: { courierId: true },
    });
    return row !== null;
  }

  /**
   * Normalises the requested branch list and holds it against the actor's own
   * scope. A branch manager has exactly one branch, so the only roster they
   * may write is `[their branch]`.
   */
  #assertBranchScope(branchIds: string[], actor: CourierAdminActor): string[] {
    const unique = [...new Set(branchIds)];
    if (unique.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.COURIER_BRANCH_REQUIRED,
        message: 'A courier must belong to at least one branch.',
      });
    }
    if (actor.isSuperAdmin) return unique;
    const own = [...actor.branchIds];
    if (own.length !== 1 || unique.length !== 1 || unique[0] !== own[0]) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'You can only manage the couriers of your own branch.',
      });
    }
    return unique;
  }

  #resolveReadScope(branchId: string | undefined, actor: CourierAdminActor): string | undefined {
    if (actor.isSuperAdmin) return branchId;
    const own = [...actor.branchIds];
    if (own.length !== 1) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'This account is not assigned to a branch.',
      });
    }
    if (branchId && branchId !== own[0]) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'You can only view the couriers of your own branch.',
      });
    }
    return own[0];
  }

  async #assertCanManage(courierId: string, actor: CourierAdminActor): Promise<CourierRow> {
    const prisma = this.#require();
    const row = await prisma.courierProfile.findUnique({
      where: { id: courierId },
      include: COURIER_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Courier not found.' });
    }
    if (actor.isSuperAdmin) return row;
    const own = [...actor.branchIds];
    const shared = own.some((branchId) =>
      row.branchScopes.some((scope) => scope.branchId === branchId),
    );
    if (own.length !== 1 || !shared) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'This courier is outside your branch.',
      });
    }
    return row;
  }

  async #loadUsernames(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const rows = await this.#require().user.findMany({
      where: { id: { in: unique } },
      select: { id: true, primaryIdentifier: true },
    });
    return new Map(rows.map((row) => [row.id, row.primaryIdentifier ?? '']));
  }

  #map(row: CourierRow, usernames: ReadonlyMap<string, string>): CourierAccountDto {
    return {
      id: row.id,
      userId: row.userId,
      displayName: row.displayName,
      username: usernames.get(row.userId) ?? '',
      phone: row.phone,
      isActive: row.isActive,
      maxActiveDeliveries: row.maxActiveDeliveries,
      branches: row.branchScopes.map((scope) => ({
        branchId: scope.branchId,
        branchName: scope.branch.name,
        isPrimary: scope.isPrimary,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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
        resourceType: 'COURIER',
        resourceId: input.resourceId,
        priorValuesJson: input.priorValues as Prisma.InputJsonValue | undefined,
        newValuesJson: input.newValues as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
