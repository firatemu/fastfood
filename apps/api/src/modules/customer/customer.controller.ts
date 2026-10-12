import { ADDRESS_ALLOWED_PROVINCE_IDS, ErrorCodes } from '@fastfood/contracts';
import { ActorType } from '@fastfood/domain-types';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';

import {
  CustomerService,
  type CreateAddressInput,
  type UpdateAddressInput,
} from './customer.service.js';
import { FavoritesService, type FavoriteDto } from './favorites.service.js';

function serializeFavorite(favorite: FavoriteDto): Record<string, unknown> {
  return {
    id: favorite.id,
    productId: favorite.productId,
    createdAt: favorite.createdAt.toISOString(),
    product: favorite.product
      ? {
          ...favorite.product,
          basePriceMinor: favorite.product.basePriceMinor.toString(),
        }
      : null,
  };
}

/**
 * Customer /me + address endpoints (document 07 + 29).
 *
 * The principal is read from `request.principal` (set by the auth
 * pipeline during P3-005). For Phase 3 the principal is set by
 * integration tests / unit tests. Production wiring of the JWT
 * verifier lands in a future ADR per ADR-004.
 */

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

function blankToUndefined(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().min(1).max(max).optional());

const profilePatchSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  locale: z.string().min(2).max(16).optional(),
  email: z.string().trim().email().max(255).optional(),
});

const accountDeletionSchema = z.object({ confirm: z.literal(true) });

const preferencePatchSchema = z.object({
  marketingOptIn: z.boolean().optional(),
  newsletterOptIn: z.boolean().optional(),
  orderUpdatesOptIn: z.boolean().optional(),
  locale: z.string().min(2).max(16).optional(),
});

const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(64),
  recipientName: z.string().min(1).max(120),
  recipientPhone: z.string().regex(/^\+\d{10,15}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationConfirmed: z.literal(true),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  provinceId: z
    .number()
    .int()
    .refine((id) => (ADDRESS_ALLOWED_PROVINCE_IDS as readonly number[]).includes(id)),
  districtId: z.number().int().positive(),
  neighborhoodId: z.number().int().positive(),
  province: optionalText(64),
  city: optionalText(64),
  district: optionalText(64),
  neighborhood: optionalText(128),
  avenue: optionalText(255),
  street: optionalText(255),
  buildingNumber: optionalText(32),
  floor: optionalText(32),
  apartmentNumber: optionalText(32),
  floorApartment: optionalText(64),
  accessCode: z.preprocess(blankToUndefined, z.string().max(64).optional()),
  deliveryNote: optionalText(512),
  isDefault: z.boolean().optional(),
});

const favoriteCreateSchema = z.object({
  productId: z.string().uuid(),
});

const updateAddressSchema = z
  .object({
    label: optionalText(64),
    recipientName: z.string().min(1).max(120).optional(),
    recipientPhone: z
      .string()
      .regex(/^\+\d{10,15}$/)
      .optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationConfirmed: z.literal(true).optional(),
    provinceId: z
      .number()
      .int()
      .refine((id) => (ADDRESS_ALLOWED_PROVINCE_IDS as readonly number[]).includes(id))
      .optional(),
    districtId: z.number().int().positive().optional(),
    neighborhoodId: z.number().int().positive().optional(),
    province: optionalText(64),
    city: optionalText(64),
    district: optionalText(64),
    neighborhood: optionalText(128),
    avenue: optionalText(255),
    street: optionalText(255),
    buildingNumber: optionalText(32),
    floor: optionalText(32),
    apartmentNumber: optionalText(32),
    floorApartment: optionalText(64),
    accessCode: z.preprocess(blankToUndefined, z.string().max(64).optional()),
    deliveryNote: optionalText(512),
    isDefault: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    const geographyIds = [value.provinceId, value.districtId, value.neighborhoodId];
    const hasGeographyId = geographyIds.some((id) => id !== undefined);
    const hasGeographyName = [value.province, value.city, value.district, value.neighborhood].some(
      (name) => name !== undefined,
    );
    if ((hasGeographyId || hasGeographyName) && geographyIds.some((id) => id === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['neighborhoodId'],
        message: 'Province, district, and neighborhood must be selected together.',
      });
    }
    const hasLatitude = value.latitude !== undefined;
    const hasLongitude = value.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [hasLatitude ? 'longitude' : 'latitude'],
        message: 'Latitude and longitude must be provided together.',
      });
    }
    if ((hasLatitude || hasLongitude) && value.locationConfirmed !== true) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationConfirmed'],
        message: 'Select and confirm a location on the map before saving.',
      });
    }
  });

const geographyOptionIdSchema = z.coerce.number().int().positive();

@Injectable()
@UseGuards(AuthGuard, AccountStatusGuard)
@Controller({ path: '' })
export class CustomerController {
  constructor(
    @Inject(CustomerService) private readonly service: CustomerService,
    @Inject(LoyaltyService) private readonly loyalty: LoyaltyService,
    @Inject(FavoritesService) private readonly favorites: FavoritesService,
  ) {}

  #geographyValidationError(path: string): unknown {
    return {
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'One or more fields are invalid.',
        details: {
          fields: [
            {
              path,
              code: 'INVALID_ADDRESS_GEOGRAPHY',
              message: 'Choose a province, district, and neighborhood from the available lists.',
            },
          ],
        },
        requestId: REQUEST_ID,
      },
    };
  }

  private getPrincipal(
    request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): AuthenticatedPrincipal {
    if (!request.principal) {
      throw new NotFoundException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'No principal.',
      });
    }
    return request.principal;
  }

  @Get('me')
  async getMe(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.getPrincipal(request);
    const profile = await this.service.getProfile(principal);
    return { data: profile, meta: { requestId: REQUEST_ID } };
  }

  @Patch('me')
  async patchMe(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    const parsed = safeValidate(profilePatchSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const profile = await this.service.patchProfile(principal, parsed.data);
    return { data: profile, meta: { requestId: REQUEST_ID } };
  }

  @Delete('me')
  @HttpCode(200)
  async deleteMe(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    if (principal.actorType !== ActorType.CUSTOMER) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_PERMISSION_DENIED,
        message: 'Only customer accounts can be deleted here.',
      });
    }
    const parsed = safeValidate(accountDeletionSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Hesap silme onayı gerekli.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    await this.service.deleteAccount(principal);
    return { data: { deleted: true }, meta: { requestId: REQUEST_ID } };
  }

  @Get('me/preferences')
  async getPreferences(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.getPrincipal(request);
    const preferences = await this.service.getPreferences(principal);
    return { data: preferences, meta: { requestId: REQUEST_ID } };
  }

  @Patch('me/preferences')
  async patchPreferences(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    const parsed = safeValidate(preferencePatchSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const preferences = await this.service.patchPreferences(principal, parsed.data);
    return { data: preferences, meta: { requestId: REQUEST_ID } };
  }

  @Get('me/loyalty')
  async getLoyalty(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.getPrincipal(request);
    const points = await this.loyalty.getBalance(principal.id);
    return {
      data: {
        userId: principal.id,
        points: points.toString(),
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('me/addresses')
  async listAddresses(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.getPrincipal(request);
    const addresses = await this.service.listAddresses(principal);
    return {
      data: addresses,
      meta: {
        requestId: REQUEST_ID,
        pagination: {
          page: 1,
          pageSize: addresses.length,
          totalItems: addresses.length,
          totalPages: 1,
        },
      },
    };
  }

  @Get('me/address-geography/provinces')
  async listAddressProvinces(): Promise<unknown> {
    const data = await this.service.listAddressProvinces();
    return { data, meta: { requestId: REQUEST_ID } };
  }

  @Get('me/address-geography/provinces/:provinceId/districts')
  async listAddressDistricts(
    @Param('provinceId') provinceId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const parsed = geographyOptionIdSchema.safeParse(provinceId);
    if (
      !parsed.success ||
      !(ADDRESS_ALLOWED_PROVINCE_IDS as readonly number[]).includes(parsed.data)
    ) {
      reply.status(400);
      return this.#geographyValidationError('provinceId');
    }
    const data = await this.service.listAddressDistricts(parsed.data);
    return { data, meta: { requestId: REQUEST_ID } };
  }

  @Get('me/address-geography/districts/:districtId/neighborhoods')
  async listAddressNeighborhoods(
    @Param('districtId') districtId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const parsed = geographyOptionIdSchema.safeParse(districtId);
    if (!parsed.success) {
      reply.status(400);
      return this.#geographyValidationError('districtId');
    }
    const data = await this.service.listAddressNeighborhoods(parsed.data);
    return { data, meta: { requestId: REQUEST_ID } };
  }

  @Post('me/addresses')
  async createAddress(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    const parsed = safeValidate(createAddressSchema, body);
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const address = await this.service.createAddress(principal, parsed.data as CreateAddressInput);
    return { data: address, meta: { requestId: REQUEST_ID } };
  }

  @Patch('me/addresses/:addressId')
  async updateAddress(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Param('addressId') addressId: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    const parsed = safeValidate(updateAddressSchema, body);
    if (!parsed.ok) {
      reply.status(400);
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const address = await this.service.updateAddress(
        principal,
        addressId,
        parsed.data as UpdateAddressInput,
      );
      return { data: address, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string; getStatus?: () => number; response?: unknown };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Address not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      if (e.name === 'ForbiddenException') {
        return {
          error: {
            code: ErrorCodes.AUTH_SCOPE_DENIED,
            message: 'You do not have access to this resource.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @Delete('me/addresses/:addressId')
  @HttpCode(200)
  async deleteAddress(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Param('addressId') addressId: string,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    try {
      await this.service.deleteAddress(principal, addressId);
      return { data: { ok: true }, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Address not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      if (e.name === 'ForbiddenException') {
        return {
          error: {
            code: ErrorCodes.AUTH_SCOPE_DENIED,
            message: 'You do not have access to this resource.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @Get('me/favorites')
  async listFavorites(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Query('branchId') branchId?: string,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    const rows = await this.favorites.list(principal.id, branchId);
    return { data: rows.map(serializeFavorite), meta: { requestId: REQUEST_ID } };
  }

  @Post('me/favorites')
  @HttpCode(201)
  async addFavorite(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    const parsed = safeValidate(favoriteCreateSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const favorite = await this.favorites.add(principal.id, parsed.data.productId);
      return { data: serializeFavorite(favorite), meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @Delete('me/favorites/:favoriteId')
  @HttpCode(200)
  async deleteFavorite(
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Param('favoriteId') favoriteId: string,
  ): Promise<unknown> {
    const principal = this.getPrincipal(req);
    try {
      await this.favorites.remove(principal.id, favoriteId);
      return { data: { ok: true }, meta: { requestId: REQUEST_ID } };
    } catch {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Favorite not found.',
          requestId: REQUEST_ID,
        },
      };
    }
  }
}
