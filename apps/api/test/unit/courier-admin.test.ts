/**
 * Unit tests for the courier roster administration service.
 *
 * The rules worth pinning down here are the ones an administrator can feel:
 * a branch manager cannot write outside their own branch, a username cannot be
 * claimed twice, pausing a courier actually revokes their sign-in, and a branch
 * cannot be dropped from a roster while an unfinished delivery depends on it.
 * All of them are decided in the service around the write, so they are tested
 * against a small in-memory double rather than a live database.
 */
import { describe, expect, it } from 'vitest';

import type { PrismaService } from '../../src/common/database/prisma.service.js';
import {
  CourierAdminService,
  type CourierAdminActor,
} from '../../src/modules/courier/courier-admin.service.js';

const BRANCH = '01900000-0000-7000-8000-faaaaaaaaaaa';
const OTHER_BRANCH = '01900000-0000-7000-8000-bbbbbbbbbbbb';
const ACTOR = '01900000-0000-7000-8000-0000000000aa';
const PASSWORD = 'kurye-sifresi-2026';

interface FakeBranch {
  id: string;
  name: string;
  isActive: boolean;
}

interface FakeUser {
  id: string;
  primaryIdentifier: string | null;
  displayName: string | null;
  actorType: string;
  status: string;
  disabledAt: Date | null;
}

interface FakeCourier {
  id: string;
  userId: string;
  displayName: string;
  phone: string | null;
  isActive: boolean;
  maxActiveDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeScope {
  courierId: string;
  branchId: string;
  isPrimary: boolean;
  assignedByUserId: string;
  createdAt: Date;
}

interface FakeDelivery {
  id: string;
  courierId: string | null;
  branchId: string;
  status: string;
}

interface CourierWithScopes extends FakeCourier {
  branchScopes: Array<FakeScope & { branch: { id: string; name: string } }>;
}

class FakePrisma {
  branches = new Map<string, FakeBranch>();
  users = new Map<string, FakeUser>();
  couriers = new Map<string, FakeCourier>();
  scopes: FakeScope[] = [];
  deliveries: FakeDelivery[] = [];
  identitySubjects = new Set<string>();
  auditActions: string[] = [];
  staffPasswords: string[] = [];
  #seq = 0;

  #nextId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-8000-${this.#seq.toString(16).padStart(12, '0')}`;
  }

  addBranch(id: string, name: string, isActive = true): void {
    this.branches.set(id, { id, name, isActive });
  }

  // Named `branchEntity` rather than `branch` so it does not shadow the
  // `branch` Prisma delegate stub declared below.
  branchEntity(id: string): FakeBranch {
    const branch = this.branches.get(id);
    if (!branch) throw new Error(`BRANCH_NOT_SEEDED:${id}`);
    return branch;
  }

  userOf(courier: FakeCourier): FakeUser {
    const user = this.users.get(courier.userId);
    if (!user) throw new Error(`USER_NOT_SEEDED:${courier.userId}`);
    return user;
  }

  courierOf(id: string): FakeCourier {
    const courier = this.couriers.get(id);
    if (!courier) throw new Error(`COURIER_NOT_SEEDED:${id}`);
    return courier;
  }

  deliveryAt(index: number): FakeDelivery {
    const delivery = this.deliveries[index];
    if (!delivery) throw new Error(`DELIVERY_NOT_SEEDED:${index}`);
    return delivery;
  }

  seedCourier(displayName: string, username: string, branchIds: string[]): FakeCourier {
    const user: FakeUser = {
      id: this.#nextId(),
      primaryIdentifier: username,
      displayName,
      actorType: 'COURIER',
      status: 'ACTIVE',
      disabledAt: null,
    };
    this.users.set(user.id, user);
    const courier: FakeCourier = {
      id: this.#nextId(),
      userId: user.id,
      displayName,
      phone: null,
      isActive: true,
      maxActiveDeliveries: 3,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    this.couriers.set(courier.id, courier);
    branchIds.forEach((branchId, index) => {
      this.scopes.push({
        courierId: courier.id,
        branchId,
        isPrimary: index === 0,
        assignedByUserId: ACTOR,
        createdAt: new Date(0),
      });
    });
    return courier;
  }

  #hydrate(courier: FakeCourier): CourierWithScopes {
    return {
      ...courier,
      branchScopes: this.scopes
        .filter((scope) => scope.courierId === courier.id)
        .map((scope) => ({
          ...scope,
          branch: {
            id: scope.branchId,
            name: this.branches.get(scope.branchId)?.name ?? 'Bilinmeyen şube',
          },
        })),
    };
  }

  readonly $transaction = async (run: (tx: FakePrisma) => Promise<unknown>): Promise<unknown> =>
    run(this);

  readonly user = {
    findUnique: async (args: { where: { primaryIdentifier: string } }) => {
      for (const user of this.users.values()) {
        if (user.primaryIdentifier === args.where.primaryIdentifier) return { id: user.id };
      }
      return null;
    },
    findMany: async (args: { where: { id: { in: string[] } } }) => {
      return [...this.users.values()]
        .filter((user) => args.where.id.in.includes(user.id))
        .map((user) => ({ id: user.id, primaryIdentifier: user.primaryIdentifier }));
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const id = this.#nextId();
      const user: FakeUser = {
        id,
        primaryIdentifier: (args.data['primaryIdentifier'] as string) ?? null,
        displayName: (args.data['displayName'] as string) ?? null,
        actorType: String(args.data['actorType']),
        status: String(args.data['status']),
        disabledAt: null,
      };
      this.users.set(id, user);
      const profile = args.data['staffProfile'] as { create: { passwordHash: string } } | undefined;
      if (profile) this.staffPasswords.push(profile.create.passwordHash);
      return user;
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const user = this.users.get(args.where.id);
      if (!user) throw new Error('USER_NOT_FOUND');
      if (args.data['displayName'] !== undefined)
        user.displayName = args.data['displayName'] as string;
      if (args.data['status'] !== undefined) user.status = String(args.data['status']);
      if (args.data['disabledAt'] !== undefined)
        user.disabledAt = args.data['disabledAt'] as Date | null;
      return user;
    },
  };

  readonly authIdentity = {
    findUnique: async (args: {
      where: { provider_providerSubject: { providerSubject: string } };
    }) =>
      this.identitySubjects.has(args.where.provider_providerSubject.providerSubject)
        ? { userId: '01900000-0000-7000-8000-0000000000ff' }
        : null,
  };

  readonly branch = {
    findMany: async (args: { where: { id: { in: string[] } } }) => {
      return args.where.id.in.flatMap((id) => {
        const branch = this.branches.get(id);
        return branch ? [{ id: branch.id, isActive: branch.isActive }] : [];
      });
    },
  };

  readonly courierProfile = {
    findMany: async (args: { where?: { branchScopes?: { some: { branchId: string } } } }) => {
      const branchId = args.where?.branchScopes?.some.branchId;
      return [...this.couriers.values()]
        .filter((courier) =>
          branchId
            ? this.scopes.some(
                (scope) => scope.courierId === courier.id && scope.branchId === branchId,
              )
            : true,
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((courier) => this.#hydrate(courier));
    },
    findUnique: async (args: { where: { id: string } }) => {
      const courier = this.couriers.get(args.where.id);
      return courier ? this.#hydrate(courier) : null;
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const courier: FakeCourier = {
        id: this.#nextId(),
        userId: String(args.data['userId']),
        displayName: String(args.data['displayName']),
        phone: (args.data['phone'] as string) ?? null,
        isActive: true,
        maxActiveDeliveries: Number(args.data['maxActiveDeliveries'] ?? 3),
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };
      this.couriers.set(courier.id, courier);
      return courier;
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const courier = this.couriers.get(args.where.id);
      if (!courier) throw new Error('COURIER_NOT_FOUND');
      if (args.data['displayName'] !== undefined)
        courier.displayName = String(args.data['displayName']);
      if (args.data['phone'] !== undefined) courier.phone = args.data['phone'] as string | null;
      if (args.data['maxActiveDeliveries'] !== undefined)
        courier.maxActiveDeliveries = Number(args.data['maxActiveDeliveries']);
      if (args.data['isActive'] !== undefined) courier.isActive = Boolean(args.data['isActive']);
      courier.updatedAt = new Date();
      return courier;
    },
  };

  readonly courierBranch = {
    findUnique: async (args: {
      where: { courierId_branchId: { courierId: string; branchId: string } };
    }) => {
      const match = this.scopes.find(
        (scope) =>
          scope.courierId === args.where.courierId_branchId.courierId &&
          scope.branchId === args.where.courierId_branchId.branchId,
      );
      return match ? { courierId: match.courierId } : null;
    },
    createMany: async (args: { data: FakeScope[] }) => {
      for (const row of args.data) {
        this.scopes.push({ ...row, createdAt: new Date(0) });
      }
      return { count: args.data.length };
    },
    deleteMany: async (args: { where: { courierId: string } }) => {
      const before = this.scopes.length;
      this.scopes = this.scopes.filter((scope) => scope.courierId !== args.where.courierId);
      return { count: before - this.scopes.length };
    },
  };

  readonly delivery = {
    findFirst: async (args: {
      where: { branchId: { in: string[] }; courierId: string; status: { in: string[] } };
    }) => {
      const match = this.deliveries.find(
        (delivery) =>
          args.where.branchId.in.includes(delivery.branchId) &&
          delivery.courierId === args.where.courierId &&
          args.where.status.in.includes(delivery.status),
      );
      return match ? { id: match.id } : null;
    },
  };

  readonly staffProfile = {
    upsert: async (args: { where: { userId: string }; create: { passwordHash: string } }) => {
      this.staffPasswords.push(args.create.passwordHash);
      return { userId: args.where.userId };
    },
  };

  readonly auditLog = {
    create: async (args: { data: { action: string } }) => {
      this.auditActions.push(args.data.action);
      return args.data;
    },
  };
}

function superAdmin(): CourierAdminActor {
  return { userId: ACTOR, isSuperAdmin: true, branchIds: new Set<string>() };
}

function branchManager(branchId = BRANCH): CourierAdminActor {
  return { userId: ACTOR, isSuperAdmin: false, branchIds: new Set([branchId]) };
}

function build(): { service: CourierAdminService; prisma: FakePrisma } {
  const prisma = new FakePrisma();
  prisma.addBranch(BRANCH, 'Kadıköy');
  prisma.addBranch(OTHER_BRANCH, 'Beşiktaş');
  return { service: new CourierAdminService(prisma as unknown as PrismaService), prisma };
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ response: { code } });
}

describe('courier roster creation', () => {
  it('provisions the login account, the profile and the branch roster together', async () => {
    const { service, prisma } = build();
    const created = await service.create(
      {
        displayName: '  Deniz Yılmaz  ',
        username: 'Deniz.Y',
        password: PASSWORD,
        phone: '05321112233',
        branchIds: [BRANCH],
      },
      superAdmin(),
    );

    expect(created.displayName).toBe('Deniz Yılmaz');
    expect(created.username).toBe('deniz.y');
    expect(created.maxActiveDeliveries).toBe(3);
    expect(created.branches).toEqual([
      { branchId: BRANCH, branchName: 'Kadıköy', isPrimary: true },
    ]);
    // The password is stored as a scrypt hash, never in the clear.
    expect(prisma.staffPasswords).toHaveLength(1);
    expect(prisma.staffPasswords[0]).toMatch(/^scrypt\$1\$/);
    expect(prisma.staffPasswords[0]).not.toContain(PASSWORD);
    expect(prisma.auditActions).toContain('courier.created');
  });

  it('marks the first branch as primary when a courier serves several', async () => {
    const { service } = build();
    const created = await service.create(
      {
        displayName: 'Ada Kaya',
        username: 'ada.kaya',
        password: PASSWORD,
        branchIds: [BRANCH, OTHER_BRANCH],
      },
      superAdmin(),
    );
    expect(created.branches.map((branch) => branch.isPrimary)).toEqual([true, false]);
  });

  it('refuses a username that is already taken', async () => {
    const { service } = build();
    await service.create(
      { displayName: 'Deniz Yılmaz', username: 'deniz.y', password: PASSWORD, branchIds: [BRANCH] },
      superAdmin(),
    );
    await expectCode(
      service.create(
        {
          displayName: 'Deniz Kaya',
          username: '  DENIZ.Y  ',
          password: PASSWORD,
          branchIds: [BRANCH],
        },
        superAdmin(),
      ),
      'COURIER_USERNAME_TAKEN',
    );
  });

  it('refuses a branch that does not exist or is not operating', async () => {
    const { service, prisma } = build();
    prisma.branchEntity(OTHER_BRANCH).isActive = false;
    await expectCode(
      service.create(
        {
          displayName: 'Ada Kaya',
          username: 'ada.kaya',
          password: PASSWORD,
          branchIds: ['01900000-0000-7000-8000-999999999999'],
        },
        superAdmin(),
      ),
      'NOT_FOUND',
    );
    await expectCode(
      service.create(
        {
          displayName: 'Ada Kaya',
          username: 'ada.kaya',
          password: PASSWORD,
          branchIds: [OTHER_BRANCH],
        },
        superAdmin(),
      ),
      'VALIDATION_ERROR',
    );
  });
});

describe('courier roster branch scope', () => {
  it('lets a branch manager roster a courier for their own branch', async () => {
    const { service } = build();
    const created = await service.create(
      { displayName: 'Deniz Yılmaz', username: 'deniz.y', password: PASSWORD, branchIds: [BRANCH] },
      branchManager(),
    );
    expect(created.branches.map((branch) => branch.branchId)).toEqual([BRANCH]);
  });

  it('stops a branch manager from rostering a courier for another branch', async () => {
    const { service } = build();
    await expectCode(
      service.create(
        {
          displayName: 'Deniz Yılmaz',
          username: 'deniz.y',
          password: PASSWORD,
          branchIds: [OTHER_BRANCH],
        },
        branchManager(),
      ),
      'AUTH_SCOPE_DENIED',
    );
  });

  it('stops a branch manager from spreading a courier over two branches', async () => {
    const { service } = build();
    await expectCode(
      service.create(
        {
          displayName: 'Deniz Yılmaz',
          username: 'deniz.y',
          password: PASSWORD,
          branchIds: [BRANCH, OTHER_BRANCH],
        },
        branchManager(),
      ),
      'AUTH_SCOPE_DENIED',
    );
  });

  it('shows a branch manager only their own branch, and refuses a foreign one', async () => {
    const { service, prisma } = build();
    prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH]);
    prisma.seedCourier('Bora Şen', 'bora.sen', [OTHER_BRANCH]);

    const own = await service.list(undefined, branchManager());
    expect(own.map((courier) => courier.displayName)).toEqual(['Ada Kaya']);
    // Asking for another branch is refused outright rather than quietly
    // rewritten, so a client bug cannot silently widen a roster.
    await expectCode(service.list(OTHER_BRANCH, branchManager()), 'AUTH_SCOPE_DENIED');
  });

  it('shows a super admin the whole roster and the login name on each row', async () => {
    const { service, prisma } = build();
    prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH]);
    prisma.seedCourier('Bora Şen', 'bora.sen', [OTHER_BRANCH]);

    const all = await service.list(undefined, superAdmin());
    expect(all.map((courier) => courier.displayName)).toEqual(['Ada Kaya', 'Bora Şen']);
    expect(all.map((courier) => courier.username)).toEqual(['ada.kaya', 'bora.sen']);
  });

  it('stops a branch manager from editing a courier that is not in their branch', async () => {
    const { service, prisma } = build();
    const foreign = prisma.seedCourier('Bora Şen', 'bora.sen', [OTHER_BRANCH]);
    await expectCode(
      service.update(foreign.id, { displayName: 'Bora Şen' }, branchManager()),
      'AUTH_SCOPE_DENIED',
    );
  });

  it('reports a missing courier as not found rather than as a scope problem', async () => {
    const { service } = build();
    await expectCode(
      service.update(
        '01900000-0000-7000-8000-999999999999',
        { displayName: 'Deniz' },
        superAdmin(),
      ),
      'NOT_FOUND',
    );
  });
});

describe('courier roster maintenance', () => {
  it('replaces the branch roster wholesale', async () => {
    const { service, prisma } = build();
    const courier = prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH]);
    const updated = await service.setBranches(courier.id, [OTHER_BRANCH], superAdmin());
    expect(updated.branches).toEqual([
      { branchId: OTHER_BRANCH, branchName: 'Beşiktaş', isPrimary: true },
    ]);
    expect(prisma.scopes.map((scope) => scope.branchId)).toEqual([OTHER_BRANCH]);
  });

  it('refuses to drop a branch that still has an unfinished delivery', async () => {
    const { service, prisma } = build();
    const courier = prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH, OTHER_BRANCH]);
    prisma.deliveries.push({
      id: 'd1',
      courierId: courier.id,
      branchId: BRANCH,
      status: 'ON_THE_WAY',
    });
    await expectCode(
      service.setBranches(courier.id, [OTHER_BRANCH], superAdmin()),
      'COURIER_HAS_ACTIVE_DELIVERY',
    );
    // A finished delivery does not block the move.
    prisma.deliveryAt(0).status = 'DELIVERED';
    const updated = await service.setBranches(courier.id, [OTHER_BRANCH], superAdmin());
    expect(updated.branches).toHaveLength(1);
  });

  it('rejects an empty roster as a business rule, not a schema accident', async () => {
    const { service, prisma } = build();
    const courier = prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH]);
    await expectCode(service.setBranches(courier.id, [], superAdmin()), 'COURIER_BRANCH_REQUIRED');
  });

  it('revokes sign-in when a courier is paused and restores it when resumed', async () => {
    const { service, prisma } = build();
    const courier = prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH]);
    const user = prisma.userOf(courier);

    const paused = await service.update(courier.id, { isActive: false }, superAdmin());
    expect(paused.isActive).toBe(false);
    expect(user.status).toBe('DISABLED');
    expect(user.disabledAt).toBeInstanceOf(Date);

    await service.update(courier.id, { isActive: true }, superAdmin());
    expect(user.status).toBe('ACTIVE');
    expect(user.disabledAt).toBeNull();
  });

  it('keeps the user display name in step with the profile name', async () => {
    const { service, prisma } = build();
    const courier = prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH]);
    await service.update(courier.id, { displayName: 'Ada Kaya Yılmaz' }, superAdmin());
    expect(prisma.userOf(courier).displayName).toBe('Ada Kaya Yılmaz');
    expect(prisma.courierOf(courier.id).displayName).toBe('Ada Kaya Yılmaz');
  });

  it('rehashes the password on reset without touching the username', async () => {
    const { service, prisma } = build();
    const courier = prisma.seedCourier('Ada Kaya', 'ada.kaya', [BRANCH]);
    const before = prisma.staffPasswords.length;
    const updated = await service.setPassword(courier.id, 'yeni-sifre-2026', superAdmin());
    expect(updated.username).toBe('ada.kaya');
    expect(prisma.staffPasswords).toHaveLength(before + 1);
    expect(prisma.auditActions).toContain('courier.password_reset');
  });

  it('requires the database', async () => {
    const service = new CourierAdminService(null);
    await expect(service.list(undefined, superAdmin())).rejects.toThrow('DATABASE_REQUIRED');
  });
});
