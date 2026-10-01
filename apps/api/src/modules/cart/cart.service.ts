import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

import { CartOutboxService } from './cart-outbox.service.js';

export interface CartLineItemDto {
  id: string;
  productId: string;
  productVariantId: string | null;
  quantity: number;
  unitPriceMinorSnapshot: bigint;
  currencySnapshot: string;
  deliveryNote: string | null;
  displayOrder: number;
  modifiers: { modifierId: string; priceDeltaMinorSnapshot: bigint }[];
  removals: { ingredientId: string }[];
}

export interface CartDto {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  status: 'OPEN' | 'CONVERTED' | 'ABANDONED';
  branchId: string | null;
  lineItems: CartLineItemDto[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface AddCartLineInput {
  productId: string;
  productVariantId?: string;
  quantity: number;
  unitPriceMinorSnapshot?: bigint;
  currencySnapshot?: string;
  deliveryNote?: string;
  modifiers?: { modifierId: string; priceDeltaMinorSnapshot: bigint }[];
  removals?: { ingredientId: string }[];
}

export interface UpdateCartLineInput {
  quantity?: number;
  deliveryNote?: string;
  modifiers?: { modifierId: string; priceDeltaMinorSnapshot: bigint }[];
  removals?: { ingredientId: string }[];
}

type CartInclude = {
  lineItems: {
    include: { modifiers: true; removals: true };
    orderBy: { displayOrder: 'asc' };
  };
};

const CART_INCLUDE = {
  lineItems: {
    include: { modifiers: true, removals: true },
    orderBy: { displayOrder: 'asc' as const },
  },
} satisfies CartInclude;

@Injectable()
export class CartService {
  readonly #carts = new Map<string, CartDto>();
  readonly #byGuestSession = new Map<string, string>();
  readonly #byUser = new Map<string, string>();
  #seq = 0;

  constructor(
    @Optional() @Inject(CartOutboxService) private readonly outbox: CartOutboxService | null = null,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-8000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  #serialize(cart: CartDto): CartDto {
    return {
      ...cart,
      lineItems: cart.lineItems.map((li) => ({
        ...li,
        modifiers: li.modifiers.map((m) => ({ ...m })),
        removals: li.removals.map((r) => ({ ...r })),
      })),
    };
  }

  #mapRow(row: {
    id: string;
    userId: string | null;
    guestSessionId: string | null;
    status: string;
    branchId: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
    lineItems: Array<{
      id: string;
      productId: string;
      productVariantId: string | null;
      quantity: number;
      unitPriceMinorSnapshot: bigint;
      currencySnapshot: string;
      deliveryNote: string | null;
      displayOrder: number;
      modifiers: Array<{ modifierId: string; priceDeltaMinorSnapshot: bigint }>;
      removals: Array<{ ingredientId: string }>;
    }>;
  }): CartDto {
    return {
      id: row.id,
      userId: row.userId,
      guestSessionId: row.guestSessionId,
      status: row.status as CartDto['status'],
      branchId: row.branchId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt,
      lineItems: row.lineItems.map((li) => ({
        id: li.id,
        productId: li.productId,
        productVariantId: li.productVariantId,
        quantity: li.quantity,
        unitPriceMinorSnapshot: li.unitPriceMinorSnapshot,
        currencySnapshot: li.currencySnapshot,
        deliveryNote: li.deliveryNote,
        displayOrder: li.displayOrder,
        modifiers: li.modifiers.map((m) => ({
          modifierId: m.modifierId,
          priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
        })),
        removals: li.removals.map((r) => ({ ingredientId: r.ingredientId })),
      })),
    };
  }

  async resolveCart(opts: { userId?: string; guestSessionId?: string }): Promise<CartDto | null> {
    if (!this.prisma) {
      if (opts.userId) {
        const id = this.#byUser.get(opts.userId);
        if (id) {
          const cart = this.#carts.get(id);
          if (cart) return this.#serialize(cart);
        }
      }
      if (opts.guestSessionId) {
        const id = this.#byGuestSession.get(opts.guestSessionId);
        if (id) {
          const cart = this.#carts.get(id);
          if (cart) return this.#serialize(cart);
        }
      }
      return null;
    }
    if (opts.userId) {
      const row = await this.prisma.cart.findFirst({
        where: { userId: opts.userId, status: 'OPEN' },
        include: CART_INCLUDE,
      });
      if (row) return this.#mapRow(row);
    }
    if (opts.guestSessionId) {
      const row = await this.prisma.cart.findFirst({
        where: { guestSessionId: opts.guestSessionId, status: 'OPEN' },
        include: CART_INCLUDE,
      });
      if (row) return this.#mapRow(row);
    }
    return null;
  }

  async getCart(id: string): Promise<CartDto> {
    if (!this.prisma) {
      const cart = this.#carts.get(id);
      if (!cart) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart not found.',
        });
      }
      return this.#serialize(cart);
    }
    const row = await this.prisma.cart.findUnique({
      where: { id },
      include: CART_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Cart not found.',
      });
    }
    return this.#mapRow(row);
  }

  async getOrCreateCustomerCart(userId: string): Promise<CartDto> {
    if (!this.prisma) {
      const existing = this.#byUser.get(userId);
      if (existing) {
        const cart = this.#carts.get(existing);
        if (cart) return this.#serialize(cart);
      }
      const now = new Date();
      const cart: CartDto = {
        id: this.#newId(),
        userId,
        guestSessionId: null,
        status: 'OPEN',
        branchId: null,
        lineItems: [],
        createdAt: now,
        updatedAt: now,
        expiresAt: null,
      };
      this.#carts.set(cart.id, cart);
      this.#byUser.set(userId, cart.id);
      return this.#serialize(cart);
    }
    const existing = await this.prisma.cart.findFirst({
      where: { userId, status: 'OPEN' },
      include: CART_INCLUDE,
    });
    if (existing) return this.#mapRow(existing);
    const row = await this.prisma.cart.create({
      data: { userId, status: 'OPEN' },
      include: CART_INCLUDE,
    });
    return this.#mapRow(row);
  }

  async getOrCreateGuestCart(guestSessionId: string): Promise<CartDto> {
    if (!this.prisma) {
      const existing = this.#byGuestSession.get(guestSessionId);
      if (existing) {
        const cart = this.#carts.get(existing);
        if (cart) return this.#serialize(cart);
      }
      const now = new Date();
      const cart: CartDto = {
        id: this.#newId(),
        userId: null,
        guestSessionId,
        status: 'OPEN',
        branchId: null,
        lineItems: [],
        createdAt: now,
        updatedAt: now,
        expiresAt: null,
      };
      this.#carts.set(cart.id, cart);
      this.#byGuestSession.set(guestSessionId, cart.id);
      return this.#serialize(cart);
    }
    const existing = await this.prisma.cart.findFirst({
      where: { guestSessionId, status: 'OPEN' },
      include: CART_INCLUDE,
    });
    if (existing) return this.#mapRow(existing);
    const occupied = await this.prisma.cart.findFirst({
      where: { guestSessionId },
    });
    if (occupied) {
      await this.prisma.cart.update({
        where: { id: occupied.id },
        data: { guestSessionId: null },
      });
    }
    try {
      const row = await this.prisma.cart.create({
        data: { guestSessionId, status: 'OPEN' },
        include: CART_INCLUDE,
      });
      return this.#mapRow(row);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        const raced = await this.prisma.cart.findFirst({
          where: { guestSessionId, status: 'OPEN' },
          include: CART_INCLUDE,
        });
        if (raced) return this.#mapRow(raced);
      }
      throw err;
    }
  }

  async mergeGuestIntoCustomer(guestSessionId: string, userId: string): Promise<CartDto> {
    const customer = await this.getOrCreateCustomerCart(userId);
    if (!this.prisma) {
      const guestId = this.#byGuestSession.get(guestSessionId);
      if (!guestId) return customer;
      const guest = this.#carts.get(guestId);
      if (!guest) return customer;
      const mutable = this.#carts.get(customer.id);
      if (!mutable) return customer;
      for (const li of guest.lineItems) {
        await this.#addLineInternalMemory(mutable, li, { emit: true });
      }
      this.#carts.delete(guestId);
      this.#byGuestSession.delete(guestSessionId);
      return this.#serialize(mutable);
    }
    const guest = await this.prisma.cart.findFirst({
      where: { guestSessionId, status: 'OPEN' },
      include: CART_INCLUDE,
    });
    if (!guest) return customer;
    for (const li of guest.lineItems) {
      await this.addLine(customer.id, {
        productId: li.productId,
        productVariantId: li.productVariantId ?? undefined,
        quantity: li.quantity,
        unitPriceMinorSnapshot: li.unitPriceMinorSnapshot,
        currencySnapshot: li.currencySnapshot,
        deliveryNote: li.deliveryNote ?? undefined,
        modifiers: li.modifiers.map((m) => ({
          modifierId: m.modifierId,
          priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
        })),
        removals: li.removals.map((r) => ({ ingredientId: r.ingredientId })),
      });
    }
    await this.prisma.cart.update({
      where: { id: guest.id },
      data: { status: 'ABANDONED', guestSessionId: null },
    });
    return this.getCart(customer.id);
  }

  async addLine(cartId: string, input: AddCartLineInput): Promise<CartDto> {
    if (input.quantity <= 0) {
      throw new Error('Quantity must be positive.');
    }
    if (!this.prisma) {
      const cart = this.#carts.get(cartId);
      if (!cart) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart not found.',
        });
      }
      await this.#addLineInternalMemory(
        cart,
        {
          productId: input.productId,
          productVariantId: input.productVariantId ?? null,
          quantity: input.quantity,
          unitPriceMinorSnapshot: input.unitPriceMinorSnapshot ?? 0n,
          currencySnapshot: input.currencySnapshot ?? 'TRY',
          deliveryNote: input.deliveryNote ?? null,
          modifiers: input.modifiers ?? [],
          removals: input.removals ?? [],
        },
        { emit: true },
      );
      return this.#serialize(cart);
    }
    const cart = await this.getCart(cartId);
    const line = {
      productId: input.productId,
      productVariantId: input.productVariantId ?? null,
      quantity: input.quantity,
      unitPriceMinorSnapshot: input.unitPriceMinorSnapshot ?? 0n,
      currencySnapshot: input.currencySnapshot ?? 'TRY',
      deliveryNote: input.deliveryNote ?? null,
      modifiers: input.modifiers ?? [],
      removals: input.removals ?? [],
    };
    const existing = cart.lineItems.find(
      (li) =>
        li.productId === line.productId &&
        li.productVariantId === line.productVariantId &&
        sameModifierSet(li.modifiers, line.modifiers) &&
        sameRemovalSet(li.removals, line.removals),
    );
    if (existing) {
      await this.prisma.cartLineItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + line.quantity },
      });
      const updated = await this.getCart(cartId);
      const updatedLine = updated.lineItems.find((l) => l.id === existing.id);
      if (updatedLine) await this.#emitUpdated(updated, updatedLine);
      return updated;
    }
    const created = await this.prisma.cartLineItem.create({
      data: {
        cartId,
        productId: line.productId,
        productVariantId: line.productVariantId,
        quantity: line.quantity,
        unitPriceMinorSnapshot: line.unitPriceMinorSnapshot,
        currencySnapshot: line.currencySnapshot,
        deliveryNote: line.deliveryNote,
        displayOrder: cart.lineItems.length,
        modifiers: {
          create: line.modifiers.map((m) => ({
            modifierId: m.modifierId,
            priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
          })),
        },
        removals: {
          create: line.removals.map((r) => ({ ingredientId: r.ingredientId })),
        },
      },
      include: { modifiers: true, removals: true },
    });
    await this.prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
    const result = await this.getCart(cartId);
    await this.#emitAdded(result, {
      id: created.id,
      productId: created.productId,
      productVariantId: created.productVariantId,
      quantity: created.quantity,
      unitPriceMinorSnapshot: created.unitPriceMinorSnapshot,
      currencySnapshot: created.currencySnapshot,
      deliveryNote: created.deliveryNote,
      displayOrder: created.displayOrder,
      modifiers: created.modifiers.map((m) => ({
        modifierId: m.modifierId,
        priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
      })),
      removals: created.removals.map((r) => ({ ingredientId: r.ingredientId })),
    });
    return result;
  }

  async #addLineInternalMemory(
    cart: CartDto,
    line: Omit<CartLineItemDto, 'id' | 'displayOrder'>,
    opts: { emit: boolean },
  ): Promise<void> {
    const existing = cart.lineItems.find(
      (li) =>
        li.productId === line.productId &&
        li.productVariantId === line.productVariantId &&
        sameModifierSet(li.modifiers, line.modifiers) &&
        sameRemovalSet(li.removals, line.removals),
    );
    if (existing) {
      existing.quantity += line.quantity;
      cart.updatedAt = new Date();
      if (opts.emit) await this.#emitUpdated(cart, existing);
      return;
    }
    const created: CartLineItemDto = {
      id: this.#newId(),
      productId: line.productId,
      productVariantId: line.productVariantId,
      quantity: line.quantity,
      unitPriceMinorSnapshot: line.unitPriceMinorSnapshot,
      currencySnapshot: line.currencySnapshot,
      deliveryNote: line.deliveryNote,
      displayOrder: cart.lineItems.length,
      modifiers: line.modifiers,
      removals: line.removals,
    };
    cart.lineItems.push(created);
    cart.updatedAt = new Date();
    if (opts.emit) await this.#emitAdded(cart, created);
  }

  async updateLine(cartId: string, lineId: string, patch: UpdateCartLineInput): Promise<CartDto> {
    if (!this.prisma) {
      const cart = this.#carts.get(cartId);
      if (!cart) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart not found.',
        });
      }
      const li = cart.lineItems.find((x) => x.id === lineId);
      if (!li) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart line not found.',
        });
      }
      if (patch.quantity !== undefined) {
        if (patch.quantity <= 0) throw new Error('Quantity must be positive.');
        li.quantity = patch.quantity;
      }
      if (patch.deliveryNote !== undefined) li.deliveryNote = patch.deliveryNote;
      if (patch.modifiers !== undefined) li.modifiers = patch.modifiers;
      if (patch.removals !== undefined) li.removals = patch.removals;
      cart.updatedAt = new Date();
      await this.#emitUpdated(cart, li);
      return this.#serialize(cart);
    }
    const existing = await this.prisma.cartLineItem.findFirst({
      where: { id: lineId, cartId },
      include: { modifiers: true, removals: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Cart line not found.',
      });
    }
    if (patch.quantity !== undefined && patch.quantity <= 0) {
      throw new Error('Quantity must be positive.');
    }
    if (patch.modifiers) {
      await this.prisma.cartLineModifier.deleteMany({ where: { cartLineItemId: lineId } });
      await this.prisma.cartLineModifier.createMany({
        data: patch.modifiers.map((m) => ({
          cartLineItemId: lineId,
          modifierId: m.modifierId,
          priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
        })),
      });
    }
    if (patch.removals) {
      await this.prisma.cartLineRemoval.deleteMany({ where: { cartLineItemId: lineId } });
      await this.prisma.cartLineRemoval.createMany({
        data: patch.removals.map((r) => ({
          cartLineItemId: lineId,
          ingredientId: r.ingredientId,
        })),
      });
    }
    await this.prisma.cartLineItem.update({
      where: { id: lineId },
      data: {
        ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
        ...(patch.deliveryNote !== undefined ? { deliveryNote: patch.deliveryNote } : {}),
      },
    });
    const result = await this.getCart(cartId);
    const li = result.lineItems.find((x) => x.id === lineId);
    if (li) await this.#emitUpdated(result, li);
    return result;
  }

  async removeLine(cartId: string, lineId: string): Promise<CartDto> {
    if (!this.prisma) {
      const cart = this.#carts.get(cartId);
      if (!cart) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart not found.',
        });
      }
      const existed = cart.lineItems.some((li) => li.id === lineId);
      cart.lineItems = cart.lineItems.filter((li) => li.id !== lineId);
      cart.updatedAt = new Date();
      if (existed) await this.#emitRemoved(cart, lineId);
      return this.#serialize(cart);
    }
    const existing = await this.prisma.cartLineItem.findFirst({
      where: { id: lineId, cartId },
    });
    if (existing) {
      await this.prisma.cartLineItem.delete({ where: { id: lineId } });
      const result = await this.getCart(cartId);
      await this.#emitRemoved(result, lineId);
      return result;
    }
    return this.getCart(cartId);
  }

  async setBranchId(cartId: string, branchId: string | null): Promise<CartDto> {
    if (!this.prisma) {
      const cart = this.#carts.get(cartId);
      if (!cart) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart not found.',
        });
      }
      cart.branchId = branchId;
      cart.updatedAt = new Date();
      return this.#serialize(cart);
    }
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { branchId },
    });
    return this.getCart(cartId);
  }

  async clearCart(cartId: string): Promise<CartDto> {
    if (!this.prisma) {
      const cart = this.#carts.get(cartId);
      if (!cart) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Cart not found.',
        });
      }
      const removedIds = cart.lineItems.map((li) => li.id);
      cart.lineItems = [];
      cart.updatedAt = new Date();
      for (const lineId of removedIds) {
        await this.#emitRemoved(cart, lineId);
      }
      return this.#serialize(cart);
    }
    const cart = await this.getCart(cartId);
    const removedIds = cart.lineItems.map((li) => li.id);
    await this.prisma.cartLineItem.deleteMany({ where: { cartId } });
    const result = await this.getCart(cartId);
    for (const lineId of removedIds) {
      await this.#emitRemoved(result, lineId);
    }
    return result;
  }

  async #emitAdded(cart: CartDto, line: CartLineItemDto): Promise<void> {
    if (!this.outbox) return;
    await this.outbox.enqueueLineAdded({
      cartId: cart.id,
      userId: cart.userId,
      guestSessionId: cart.guestSessionId,
      lineId: line.id,
      productId: line.productId,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinorSnapshot,
    });
  }

  async #emitUpdated(cart: CartDto, line: CartLineItemDto): Promise<void> {
    if (!this.outbox) return;
    await this.outbox.enqueueLineUpdated({
      cartId: cart.id,
      userId: cart.userId,
      guestSessionId: cart.guestSessionId,
      lineId: line.id,
      productId: line.productId,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinorSnapshot,
    });
  }

  async #emitRemoved(cart: CartDto, lineId: string): Promise<void> {
    if (!this.outbox) return;
    await this.outbox.enqueueLineRemoved({
      cartId: cart.id,
      userId: cart.userId,
      guestSessionId: cart.guestSessionId,
      lineId,
    });
  }
}

function sameModifierSet(a: { modifierId: string }[], b: { modifierId: string }[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a.map((x) => x.modifierId));
  return b.every((x) => sa.has(x.modifierId));
}

function sameRemovalSet(a: { ingredientId: string }[], b: { ingredientId: string }[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a.map((x) => x.ingredientId));
  return b.every((x) => sa.has(x.ingredientId));
}
