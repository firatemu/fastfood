import { ADDRESS_ALLOWED_PROVINCE_IDS, ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';

import { CustomerOwnershipPolicy } from './customer-ownership.policy.js';

export interface CustomerProfileDto {
  id: string;
  displayName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  locale: string | null;
  createdAt: string | null;
}

export interface CustomerPreferenceDto {
  marketingOptIn: boolean;
  newsletterOptIn: boolean;
  orderUpdatesOptIn: boolean;
  kvkkAcceptedAt: string | null;
  locale: string | null;
}

export interface AddressDto {
  id: string;
  label: string | null;
  recipientName: string;
  recipientPhone: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  provinceId: number | null;
  districtId: number | null;
  neighborhoodId: number | null;
  province: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  avenue: string | null;
  street: string | null;
  buildingNumber: string | null;
  floor: string | null;
  apartmentNumber: string | null;
  floorApartment: string | null;
  accessCode: string | null;
  deliveryNote: string | null;
  isDefault: boolean;
}

export interface CreateAddressInput {
  label: string;
  recipientName: string;
  recipientPhone: string;
  latitude: number;
  longitude: number;
  locationConfirmed: true;
  countryCode: string;
  provinceId: number;
  districtId: number;
  neighborhoodId: number;
  province?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  avenue?: string;
  street?: string;
  buildingNumber?: string;
  floor?: string;
  apartmentNumber?: string;
  floorApartment?: string;
  accessCode?: string;
  deliveryNote?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  recipientName?: string;
  recipientPhone?: string;
  latitude?: number;
  longitude?: number;
  locationConfirmed?: true;
  provinceId?: number;
  districtId?: number;
  neighborhoodId?: number;
  province?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  avenue?: string;
  street?: string;
  buildingNumber?: string;
  floor?: string;
  apartmentNumber?: string;
  floorApartment?: string;
  accessCode?: string;
  deliveryNote?: string;
  isDefault?: boolean;
}

function combineFloorApartment(
  floor?: string,
  apartmentNumber?: string,
  legacy?: string,
): string | null {
  if (legacy !== undefined) return legacy;
  const parts = [
    floor ? `${floor}. Kat` : null,
    apartmentNumber ? `Daire ${apartmentNumber}` : null,
  ];
  return parts.filter((part): part is string => part !== null).join(', ') || null;
}

@Injectable()
export class CustomerService {
  readonly #profiles = new Map<string, CustomerProfileDto>();
  readonly #addresses = new Map<string, AddressDto & { userId: string }>();
  readonly #preferences = new Map<string, CustomerPreferenceDto>();

  constructor(
    @Inject(CustomerOwnershipPolicy) private readonly ownership: CustomerOwnershipPolicy,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  async getProfile(principal: AuthenticatedPrincipal): Promise<CustomerProfileDto> {
    if (!this.prisma) {
      const profile = this.#profiles.get(principal.id);
      if (profile) return profile;
      return {
        id: principal.id,
        displayName: principal.id.slice(0, 12),
        phone: principal.customerId?.startsWith('+') ? principal.customerId : null,
        phoneVerified: false,
        email: null,
        emailVerified: false,
        locale: 'tr-TR',
        createdAt: null,
      };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: principal.id },
      include: { customerProfile: true },
    });
    if (!user) {
      return {
        id: principal.id,
        displayName: principal.id.slice(0, 12),
        phone: principal.customerId?.startsWith('+') ? principal.customerId : null,
        phoneVerified: false,
        email: null,
        emailVerified: false,
        locale: 'tr-TR',
        createdAt: null,
      };
    }
    return {
      id: user.id,
      displayName: user.displayName,
      phone:
        user.customerProfile?.phoneNormalized ??
        (principal.customerId?.startsWith('+') ? principal.customerId : null),
      phoneVerified: user.customerProfile?.phoneVerified ?? false,
      email: user.customerProfile?.emailNormalized ?? null,
      emailVerified: user.customerProfile?.emailVerified ?? false,
      locale: user.customerProfile?.locale ?? 'tr-TR',
      createdAt: user.createdAt.toISOString(),
    };
  }

  async patchProfile(
    principal: AuthenticatedPrincipal,
    patch: { displayName?: string; locale?: string; email?: string },
  ): Promise<CustomerProfileDto> {
    const email = patch.email ? patch.email.trim().toLowerCase() : undefined;
    if (!this.prisma) {
      const current = await this.getProfile(principal);
      const next: CustomerProfileDto = {
        ...current,
        displayName: patch.displayName ?? current.displayName,
        locale: patch.locale ?? current.locale,
        email: email ?? current.email,
        emailVerified: email && email !== current.email ? false : current.emailVerified,
      };
      this.#profiles.set(principal.id, next);
      return next;
    }
    await this.prisma.user.upsert({
      where: { id: principal.id },
      create: {
        id: principal.id,
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        displayName: patch.displayName ?? principal.id.slice(0, 12),
        customerProfile: {
          create: {
            phoneNormalized: principal.customerId?.startsWith('+') ? principal.customerId : null,
            locale: patch.locale ?? 'tr-TR',
            emailNormalized: email ?? null,
            emailVerified: false,
          },
        },
      },
      update: {
        displayName: patch.displayName,
      },
    });
    if (patch.locale !== undefined || email !== undefined) {
      const current = await this.prisma.customerProfile.findUnique({
        where: { userId: principal.id },
      });
      const emailChanged = email !== undefined && email !== current?.emailNormalized;
      await this.prisma.customerProfile.upsert({
        where: { userId: principal.id },
        create: {
          userId: principal.id,
          locale: patch.locale ?? 'tr-TR',
          phoneNormalized: principal.customerId?.startsWith('+') ? principal.customerId : null,
          emailNormalized: email ?? null,
          emailVerified: false,
        },
        update: {
          locale: patch.locale ?? current?.locale,
          emailNormalized: email ?? current?.emailNormalized,
          emailVerified: emailChanged ? false : current?.emailVerified,
          emailVerifiedAt: emailChanged ? null : current?.emailVerifiedAt,
        },
      });
    }
    return this.getProfile(principal);
  }

  async getPreferences(principal: AuthenticatedPrincipal): Promise<CustomerPreferenceDto> {
    const fallback: CustomerPreferenceDto = {
      marketingOptIn: false,
      newsletterOptIn: false,
      orderUpdatesOptIn: true,
      kvkkAcceptedAt: null,
      locale: 'tr-TR',
    };
    if (!this.prisma) {
      return this.#preferences.get(principal.id) ?? fallback;
    }
    const row = await this.prisma.customerPreference.findUnique({
      where: { userId: principal.id },
    });
    if (!row) return fallback;
    return {
      marketingOptIn: row.marketingOptIn,
      newsletterOptIn: row.newsletterOptIn,
      orderUpdatesOptIn: row.orderUpdatesOptIn,
      kvkkAcceptedAt: row.kvkkAcceptedAt?.toISOString() ?? null,
      locale: row.locale,
    };
  }

  async patchPreferences(
    principal: AuthenticatedPrincipal,
    patch: Partial<Omit<CustomerPreferenceDto, 'kvkkAcceptedAt'>>,
  ): Promise<CustomerPreferenceDto> {
    if (!this.prisma) {
      const current = await this.getPreferences(principal);
      const next: CustomerPreferenceDto = {
        ...current,
        marketingOptIn: patch.marketingOptIn ?? current.marketingOptIn,
        newsletterOptIn: patch.newsletterOptIn ?? current.newsletterOptIn,
        orderUpdatesOptIn: patch.orderUpdatesOptIn ?? current.orderUpdatesOptIn,
        locale: patch.locale ?? current.locale,
      };
      this.#preferences.set(principal.id, next);
      return next;
    }
    await this.#ensureUser(principal);
    await this.prisma.customerPreference.upsert({
      where: { userId: principal.id },
      create: {
        userId: principal.id,
        marketingOptIn: patch.marketingOptIn ?? false,
        newsletterOptIn: patch.newsletterOptIn ?? false,
        orderUpdatesOptIn: patch.orderUpdatesOptIn ?? true,
        locale: patch.locale ?? 'tr-TR',
      },
      update: {
        marketingOptIn: patch.marketingOptIn,
        newsletterOptIn: patch.newsletterOptIn,
        orderUpdatesOptIn: patch.orderUpdatesOptIn,
        locale: patch.locale,
      },
    });
    if (patch.newsletterOptIn !== undefined) {
      const profile = await this.getProfile(principal);
      if (profile.email) {
        if (patch.newsletterOptIn) {
          await this.prisma.newsletterSubscription.upsert({
            where: { email: profile.email },
            create: { email: profile.email, source: 'ember_club', userId: principal.id },
            update: { unsubscribedAt: null, userId: principal.id },
          });
        } else {
          await this.prisma.newsletterSubscription.updateMany({
            where: { email: profile.email },
            data: { unsubscribedAt: new Date() },
          });
        }
      }
    }
    return this.getPreferences(principal);
  }

  async listAddressProvinces(): Promise<
    Array<{ id: number; name: string; centerLatitude: number; centerLongitude: number }>
  > {
    if (!this.prisma) return [];
    const rows = await this.prisma.addressProvince.findMany({ orderBy: { displayOrder: 'asc' } });
    return rows.map(({ id, name, centerLatitude, centerLongitude }) => ({
      id,
      name,
      centerLatitude: centerLatitude.toNumber(),
      centerLongitude: centerLongitude.toNumber(),
    }));
  }

  async listAddressDistricts(provinceId: number): Promise<Array<{ id: number; name: string }>> {
    if (!(ADDRESS_ALLOWED_PROVINCE_IDS as readonly number[]).includes(provinceId) || !this.prisma) {
      return [];
    }
    const rows = await this.prisma.addressDistrict.findMany({ where: { provinceId } });
    return rows
      .map(({ id, name }) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'tr-TR'));
  }

  async listAddressNeighborhoods(districtId: number): Promise<Array<{ id: number; name: string }>> {
    if (!this.prisma) return [];
    const rows = await this.prisma.addressNeighborhood.findMany({
      where: { district: { provinceId: { in: [...ADDRESS_ALLOWED_PROVINCE_IDS] } }, districtId },
    });
    return rows
      .map(({ id, name }) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'tr-TR'));
  }

  async #resolveAddressGeography(input: {
    provinceId: number;
    districtId: number;
    neighborhoodId: number;
    province?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
  }): Promise<{ province: string; district: string; neighborhood: string }> {
    if (!(ADDRESS_ALLOWED_PROVINCE_IDS as readonly number[]).includes(input.provinceId)) {
      throw this.#invalidAddressGeography();
    }
    if (!this.prisma) {
      // The in-memory backing store is used only by isolated unit tests.
      return {
        province: input.province ?? input.city ?? '',
        district: input.district ?? '',
        neighborhood: input.neighborhood ?? '',
      };
    }

    const [province, district, neighborhood] = await Promise.all([
      this.prisma.addressProvince.findUnique({ where: { id: input.provinceId } }),
      this.prisma.addressDistrict.findUnique({ where: { id: input.districtId } }),
      this.prisma.addressNeighborhood.findUnique({ where: { id: input.neighborhoodId } }),
    ]);
    if (
      !province ||
      !district ||
      !neighborhood ||
      district.provinceId !== province.id ||
      neighborhood.districtId !== district.id
    ) {
      throw this.#invalidAddressGeography();
    }
    return { province: province.name, district: district.name, neighborhood: neighborhood.name };
  }

  #invalidAddressGeography(): BadRequestException {
    return new BadRequestException({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Choose a valid province, district, and neighborhood combination.',
      details: null,
    });
  }

  async listAddresses(principal: AuthenticatedPrincipal): Promise<AddressDto[]> {
    if (!this.prisma) {
      return [...this.#addresses.values()]
        .filter((a) => a.userId === principal.id)
        .map(({ userId: _userId, ...rest }) => rest);
    }
    const rows = await this.prisma.address.findMany({ where: { userId: principal.id } });
    return rows.map((a) => this.#mapAddress(a));
  }

  async createAddress(
    principal: AuthenticatedPrincipal,
    input: CreateAddressInput,
  ): Promise<AddressDto> {
    const geography = await this.#resolveAddressGeography(input);
    if (!this.prisma) {
      const id = `01900000-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0').slice(0, 12)}`;
      const address: AddressDto & { userId: string } = {
        id,
        userId: principal.id,
        label: input.label ?? null,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        latitude: input.latitude,
        longitude: input.longitude,
        countryCode: input.countryCode,
        provinceId: input.provinceId,
        districtId: input.districtId,
        neighborhoodId: input.neighborhoodId,
        province: geography.province,
        city: geography.province,
        district: geography.district,
        neighborhood: geography.neighborhood,
        avenue: input.avenue ?? null,
        street: input.street ?? null,
        buildingNumber: input.buildingNumber ?? null,
        floor: input.floor ?? null,
        apartmentNumber: input.apartmentNumber ?? null,
        floorApartment:
          combineFloorApartment(input.floor, input.apartmentNumber, input.floorApartment) ?? null,
        accessCode: input.accessCode ?? null,
        deliveryNote: input.deliveryNote ?? null,
        isDefault: input.isDefault ?? false,
      };
      if (address.isDefault) {
        for (const [key, existing] of this.#addresses) {
          if (existing.userId === principal.id && existing.id !== id) {
            this.#addresses.set(key, { ...existing, isDefault: false });
          }
        }
      }
      this.#addresses.set(id, address);
      const { userId: _userId, ...rest } = address;
      return rest;
    }
    await this.#ensureUser(principal);
    if (input.isDefault) {
      await this.#clearDefaultAddresses(principal.id);
    }
    const row = await this.prisma.address.create({
      data: {
        userId: principal.id,
        label: input.label ?? null,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        latitude: input.latitude,
        longitude: input.longitude,
        countryCode: input.countryCode,
        provinceId: input.provinceId,
        districtId: input.districtId,
        neighborhoodId: input.neighborhoodId,
        province: geography.province,
        city: geography.province,
        district: geography.district,
        neighborhood: geography.neighborhood,
        avenue: input.avenue ?? null,
        street: input.street ?? null,
        buildingNumber: input.buildingNumber ?? null,
        floor: input.floor ?? null,
        apartmentNumber: input.apartmentNumber ?? null,
        floorApartment: combineFloorApartment(
          input.floor,
          input.apartmentNumber,
          input.floorApartment,
        ),
        accessCode: input.accessCode ?? null,
        deliveryNote: input.deliveryNote ?? null,
        isDefault: input.isDefault ?? false,
      },
    });
    return this.#mapAddress(row);
  }

  async getAddress(principal: AuthenticatedPrincipal, addressId: string): Promise<AddressDto> {
    if (!this.prisma) {
      const address = this.#addresses.get(addressId);
      if (!address) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Address not found.',
        });
      }
      this.ownership.enforce(principal, address);
      const { userId: _userId, ...rest } = address;
      return rest;
    }
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Address not found.',
      });
    }
    this.ownership.enforce(principal, { userId: address.userId });
    return this.#mapAddress(address);
  }

  async updateAddress(
    principal: AuthenticatedPrincipal,
    addressId: string,
    patch: UpdateAddressInput,
  ): Promise<AddressDto> {
    const geographyValues = [patch.provinceId, patch.districtId, patch.neighborhoodId];
    const hasGeography = geographyValues.some((value) => value !== undefined);
    if (hasGeography && geographyValues.some((value) => value === undefined)) {
      throw this.#invalidAddressGeography();
    }
    const geography =
      hasGeography &&
      patch.provinceId !== undefined &&
      patch.districtId !== undefined &&
      patch.neighborhoodId !== undefined
        ? await this.#resolveAddressGeography({
            provinceId: patch.provinceId,
            districtId: patch.districtId,
            neighborhoodId: patch.neighborhoodId,
            province: patch.province,
            city: patch.city,
            district: patch.district,
            neighborhood: patch.neighborhood,
          })
        : null;
    if (!this.prisma) {
      const existing = this.#addresses.get(addressId);
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Address not found.',
        });
      }
      this.ownership.enforce(principal, existing);
      if (patch.isDefault) {
        for (const [key, row] of this.#addresses) {
          if (row.userId === principal.id && row.id !== addressId) {
            this.#addresses.set(key, { ...row, isDefault: false });
          }
        }
      }
      const next: AddressDto & { userId: string } = {
        ...existing,
        label: patch.label ?? existing.label,
        recipientName: patch.recipientName ?? existing.recipientName,
        recipientPhone: patch.recipientPhone ?? existing.recipientPhone,
        latitude: patch.latitude ?? existing.latitude,
        longitude: patch.longitude ?? existing.longitude,
        provinceId: patch.provinceId ?? existing.provinceId,
        districtId: patch.districtId ?? existing.districtId,
        neighborhoodId: patch.neighborhoodId ?? existing.neighborhoodId,
        province: geography?.province ?? patch.province ?? existing.province,
        city: geography?.province ?? patch.city ?? existing.city,
        district: geography?.district ?? patch.district ?? existing.district,
        neighborhood: geography?.neighborhood ?? patch.neighborhood ?? existing.neighborhood,
        avenue: patch.avenue ?? existing.avenue,
        street: patch.street ?? existing.street,
        buildingNumber: patch.buildingNumber ?? existing.buildingNumber,
        floor: patch.floor ?? existing.floor,
        apartmentNumber: patch.apartmentNumber ?? existing.apartmentNumber,
        floorApartment:
          patch.floor !== undefined || patch.apartmentNumber !== undefined
            ? combineFloorApartment(
                patch.floor ?? existing.floor ?? undefined,
                patch.apartmentNumber ?? existing.apartmentNumber ?? undefined,
              )
            : (patch.floorApartment ?? existing.floorApartment),
        accessCode: patch.accessCode ?? existing.accessCode,
        deliveryNote: patch.deliveryNote ?? existing.deliveryNote,
        isDefault: patch.isDefault ?? existing.isDefault,
      };
      this.#addresses.set(addressId, next);
      const { userId: _userId, ...rest } = next;
      return rest;
    }
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Address not found.',
      });
    }
    this.ownership.enforce(principal, { userId: existing.userId });
    if (patch.isDefault) {
      await this.#clearDefaultAddresses(principal.id);
    }
    const row = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        label: patch.label ?? existing.label,
        recipientName: patch.recipientName ?? existing.recipientName,
        recipientPhone: patch.recipientPhone ?? existing.recipientPhone,
        latitude: patch.latitude ?? existing.latitude,
        longitude: patch.longitude ?? existing.longitude,
        provinceId: patch.provinceId ?? existing.provinceId,
        districtId: patch.districtId ?? existing.districtId,
        neighborhoodId: patch.neighborhoodId ?? existing.neighborhoodId,
        province: geography?.province ?? patch.province ?? existing.province,
        city: geography?.province ?? patch.city ?? existing.city,
        district: geography?.district ?? patch.district ?? existing.district,
        neighborhood: geography?.neighborhood ?? patch.neighborhood ?? existing.neighborhood,
        avenue: patch.avenue ?? existing.avenue,
        street: patch.street ?? existing.street,
        buildingNumber: patch.buildingNumber ?? existing.buildingNumber,
        floor: patch.floor ?? existing.floor,
        apartmentNumber: patch.apartmentNumber ?? existing.apartmentNumber,
        floorApartment:
          patch.floor !== undefined || patch.apartmentNumber !== undefined
            ? combineFloorApartment(
                patch.floor ?? existing.floor ?? undefined,
                patch.apartmentNumber ?? existing.apartmentNumber ?? undefined,
              )
            : (patch.floorApartment ?? existing.floorApartment),
        accessCode: patch.accessCode ?? existing.accessCode,
        deliveryNote: patch.deliveryNote ?? existing.deliveryNote,
        isDefault: patch.isDefault ?? existing.isDefault,
      },
    });
    return this.#mapAddress(row);
  }

  async deleteAddress(principal: AuthenticatedPrincipal, addressId: string): Promise<void> {
    if (!this.prisma) {
      const existing = this.#addresses.get(addressId);
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Address not found.',
        });
      }
      this.ownership.enforce(principal, existing);
      this.#addresses.delete(addressId);
      return;
    }
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Address not found.',
      });
    }
    this.ownership.enforce(principal, { userId: existing.userId });
    await this.prisma.address.delete({ where: { id: addressId } });
  }

  async #clearDefaultAddresses(userId: string): Promise<void> {
    if (!this.prisma) return;
    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async #ensureUser(principal: AuthenticatedPrincipal): Promise<void> {
    if (!this.prisma) return;
    await this.prisma.user.upsert({
      where: { id: principal.id },
      create: {
        id: principal.id,
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        displayName: principal.id.slice(0, 12),
        customerProfile: {
          create: {
            phoneNormalized: principal.customerId?.startsWith('+') ? principal.customerId : null,
            locale: 'tr-TR',
          },
        },
      },
      update: {},
    });
  }

  #mapAddress(a: {
    id: string;
    label: string | null;
    recipientName: string;
    recipientPhone: string;
    latitude: { toNumber(): number } | number;
    longitude: { toNumber(): number } | number;
    countryCode: string;
    provinceId: number | null;
    districtId: number | null;
    neighborhoodId: number | null;
    province: string | null;
    city: string | null;
    district: string | null;
    neighborhood: string | null;
    avenue: string | null;
    street: string | null;
    buildingNumber: string | null;
    floor: string | null;
    apartmentNumber: string | null;
    floorApartment: string | null;
    accessCode?: string | null;
    deliveryNote: string | null;
    isDefault: boolean;
  }): AddressDto {
    return {
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      recipientPhone: a.recipientPhone,
      latitude: typeof a.latitude === 'number' ? a.latitude : a.latitude.toNumber(),
      longitude: typeof a.longitude === 'number' ? a.longitude : a.longitude.toNumber(),
      countryCode: a.countryCode,
      provinceId: a.provinceId,
      districtId: a.districtId,
      neighborhoodId: a.neighborhoodId,
      province: a.province,
      city: a.city,
      district: a.district,
      neighborhood: a.neighborhood,
      avenue: a.avenue,
      street: a.street,
      buildingNumber: a.buildingNumber,
      floor: a.floor,
      apartmentNumber: a.apartmentNumber,
      floorApartment: a.floorApartment,
      accessCode: a.accessCode ?? null,
      deliveryNote: a.deliveryNote,
      isDefault: a.isDefault,
    };
  }
}
