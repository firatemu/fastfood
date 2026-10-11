import {
  adminCourierResponseSchema,
  adminCouriersResponseSchema,
  moneyMinorStringSchema,
  uuidSchema,
} from '@fastfood/contracts';
import { z } from 'zod';

export function envelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z
      .object({
        requestId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  });
}

export const staffLoginSchema = envelope(
  z.object({
    userId: z.string(),
    refreshToken: z.string(),
    refreshExpiresAt: z.string(),
    mfaRequired: z.boolean(),
  }),
);

export const staffMfaSchema = envelope(
  z.object({
    userId: z.string(),
    accessToken: z.string(),
  }),
);

const namedEntity = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    slug: z.string().optional(),
    code: z.string().optional(),
  })
  .passthrough();

export const categoryCreateSchema = envelope(namedEntity);
export const productCreateSchema = envelope(
  namedEntity.extend({
    basePriceMinor: moneyMinorStringSchema.optional(),
  }),
);
export const branchCreateSchema = envelope(
  namedEntity.extend({
    minOrderMinor: moneyMinorStringSchema.optional(),
    deliveryFeeMinor: moneyMinorStringSchema.optional(),
  }),
);

export const listNamedSchema = envelope(z.array(namedEntity));

export const orderItemSchema = z
  .object({
    id: z.string().optional(),
    productNameSnapshot: z.string().optional(),
    quantity: z.number().optional(),
    unitPriceMinorSnapshot: moneyMinorStringSchema.optional(),
    lineGrossMinorSnapshot: moneyMinorStringSchema.optional(),
    modifiers: z
      .array(
        z
          .object({
            nameSnapshot: z.string().optional(),
            priceDeltaMinorSnapshot: moneyMinorStringSchema.optional(),
          })
          .passthrough(),
      )
      .optional(),
    removals: z.array(z.object({ nameSnapshot: z.string().optional() }).passthrough()).optional(),
  })
  .passthrough();

export const orderEventSchema = z
  .object({
    id: z.string(),
    eventType: z.string().optional(),
    fromStatus: z.string().nullable().optional(),
    toStatus: z.string().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const orderSchema = z
  .object({
    id: z.string(),
    displayNumber: z.string().optional(),
    status: z.string(),
    branchId: z.string().nullable().optional(),
    checkoutSessionId: z.string().nullable().optional(),
    finalPayableMinor: moneyMinorStringSchema.optional(),
    merchandiseNetMinor: moneyMinorStringSchema.optional(),
    deliveryFeeMinor: moneyMinorStringSchema.optional(),
    loyaltyRedeemedMinor: moneyMinorStringSchema.optional(),
    tipMinor: moneyMinorStringSchema.optional(),
    pickupDiscountMinor: moneyMinorStringSchema.optional(),
    currency: z.string().optional(),
    userId: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    fulfillmentMode: z.string().optional(),
    deliveryNote: z.string().nullable().optional(),
    buildingAccessCode: z.string().nullable().optional(),
    contactless: z.boolean().optional(),
    ecoPackaging: z.boolean().optional(),
    deliveryAddressJson: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        line1: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    items: z.array(orderItemSchema).optional(),
    events: z.array(orderEventSchema).optional(),
    branchAssignments: z
      .array(
        z
          .object({
            id: z.string().optional(),
            branchId: z.string().optional(),
            reason: z.string().nullable().optional(),
            assignedBy: z.string().nullable().optional(),
            createdAt: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    customer: z
      .object({
        userId: z.string().optional(),
        displayName: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        pointsBalance: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    payment: z
      .object({
        id: z.string().optional(),
        status: z.string().nullable().optional(),
        amountMinor: moneyMinorStringSchema.optional(),
        currency: z.string().optional(),
        providerPaymentId: z.string().nullable().optional(),
        provider: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export const ordersResponseSchema = envelope(z.array(orderSchema));
export const orderResponseSchema = envelope(orderSchema);

export const orderSummaryKpisSchema = z
  .object({
    activeCount: z.number(),
    prepCount: z.number(),
    deliveredToday: z.number(),
    grossTodayMinor: moneyMinorStringSchema,
    refundsTodayMinor: moneyMinorStringSchema,
    avgTicketMinor: moneyMinorStringSchema,
    cancellationRateBps: z.number(),
  })
  .passthrough();

export const orderSummarySchema = z
  .object({
    counts: z.record(z.string(), z.number()),
    kpis: orderSummaryKpisSchema,
  })
  .passthrough();

export const orderSummaryResponseSchema = envelope(orderSummarySchema);

export const orderListMetaSchema = z
  .object({
    requestId: z.string().optional(),
    nextCursor: z.string().nullable().optional(),
    total: z.number().optional(),
  })
  .passthrough();

export const orderListResponseSchema = z.object({
  data: z.array(orderSchema),
  meta: orderListMetaSchema.optional(),
});

export const orderFiltersSchema = z.object({
  branchId: z.string(),
  statuses: z.string().optional(),
  mode: z.enum(['DELIVERY', 'PICKUP']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  minMinor: z.string().optional(),
  maxMinor: z.string().optional(),
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().optional(),
});

export type OrderFilters = z.infer<typeof orderFiltersSchema>;

/**
 * Courier roster payloads are defined once in `@fastfood/contracts` and reused
 * here, so the operations screen cannot drift from the API contract. The
 * envelope is compatible with {@link envelope} — `meta` stays optional.
 */
export const couriersResponseSchema = adminCouriersResponseSchema;
export const courierResponseSchema = adminCourierResponseSchema;

export const deliveriesCreateSchema = envelope(
  z
    .object({
      id: z.string(),
      orderId: z.string().optional(),
      status: z.string().optional(),
    })
    .passthrough(),
);

export const unknownDataSchema = envelope(z.unknown());

export const refundSchema = envelope(
  z
    .object({
      id: z.string(),
      paymentId: z.string().optional(),
      amountMinor: moneyMinorStringSchema,
      status: z.string().optional(),
    })
    .passthrough(),
);

export const reportSalesSchema = envelope(
  z.array(
    z
      .object({
        day: z.string().optional(),
        orderCount: z.number().optional(),
        label: z.string().optional(),
        grossMinor: moneyMinorStringSchema.optional(),
        netMinor: moneyMinorStringSchema.optional(),
        refundedMinor: moneyMinorStringSchema.optional(),
      })
      .passthrough(),
  ),
);

export const reportBranchesSchema = envelope(
  z.array(
    z
      .object({
        branchId: z.string(),
        orderCount: z.number().optional(),
        grossMinor: moneyMinorStringSchema.optional(),
      })
      .passthrough(),
  ),
);

export const reportProductsSchema = envelope(
  z.array(
    z
      .object({
        productId: z.string(),
        quantity: z.number().optional(),
        grossMinor: moneyMinorStringSchema.optional(),
      })
      .passthrough(),
  ),
);

export const reportCouriersSchema = envelope(
  z.array(
    z
      .object({
        courierId: z.string(),
        deliveredCount: z.number().optional(),
        activeCount: z.number().optional(),
      })
      .passthrough(),
  ),
);

export const storefrontCategoriesSchema = envelope(
  z.array(
    z
      .object({
        id: uuidSchema,
        name: z.string(),
        slug: z.string(),
      })
      .passthrough(),
  ),
);

export const storefrontBranchesSchema = envelope(
  z.array(
    z
      .object({
        id: uuidSchema,
        name: z.string(),
        code: z.string(),
      })
      .passthrough(),
  ),
);

export const adminCategoriesSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        slug: z.string().optional(),
        description: z.string().nullable().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        parentCategoryId: z.string().nullable().optional(),
        status: z.string().optional(),
      })
      .passthrough(),
  ),
);

export const adminProductsSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        slug: z.string().optional(),
        description: z.string().nullable().optional(),
        basePriceMinor: moneyMinorStringSchema.optional(),
        currency: z.string().optional(),
        categoryId: z.string().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        status: z.string().optional(),
        imageUrl: z.string().nullable().optional(),
      })
      .passthrough(),
  ),
);

export const adminHomeSlidesSchema = envelope(
  z.object({
    products: z.array(
      z.object({
        id: z.string(),
        categoryName: z.string(),
        slug: z.string(),
        name: z.string(),
        basePriceMinor: moneyMinorStringSchema,
        currency: z.string(),
        displayOrder: z.number(),
        imageUrl: z.string().nullable(),
        heroImageUrl: z.string().nullable(),
        heroDescription: z.string().nullable(),
        isFeatured: z.boolean(),
        isActive: z.boolean(),
        isHero: z.boolean(),
        heroDisplayOrder: z.number(),
      }),
    ),
    settings: z.object({
      transitionDurationSeconds: z.number().int().min(2).max(30),
      loop: z.boolean(),
    }),
  }),
);

export const adminProductSchema = envelope(
  z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string().optional(),
      description: z.string().nullable().optional(),
      basePriceMinor: moneyMinorStringSchema.optional(),
      currency: z.string().optional(),
      categoryId: z.string().optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    })
    .passthrough(),
);

export const adminAllergensSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        products: z.array(z.object({ id: z.string(), name: z.string(), isActive: z.boolean() })),
      })
      .passthrough(),
  ),
);

export const allergenCreateSchema = envelope(
  z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
    })
    .passthrough(),
);

export const allergenDeleteSchema = envelope(z.object({ id: z.string(), deleted: z.boolean() }));

export const allergenProductLinkSchema = envelope(
  z.object({ allergenId: z.string(), productId: z.string(), linked: z.boolean() }),
);

export const adminModifierGroupsSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        selectionMin: z.number().optional(),
        selectionMax: z.number().optional(),
        isActive: z.boolean().optional(),
        modifiers: z
          .array(
            z
              .object({
                id: z.string(),
                name: z.string(),
                priceDeltaMinor: moneyMinorStringSchema,
                isActive: z.boolean(),
              })
              .passthrough(),
          )
          .optional(),
        products: z
          .array(
            z
              .object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                isActive: z.boolean(),
                displayOrder: z.number(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough(),
  ),
);

export const modifierGroupCreateSchema = envelope(
  z
    .object({
      id: z.string(),
      name: z.string(),
      selectionMin: z.number().optional(),
      selectionMax: z.number().optional(),
    })
    .passthrough(),
);

export const modifierOptionCreateSchema = envelope(
  z
    .object({
      id: z.string(),
      name: z.string(),
      priceDeltaMinor: moneyMinorStringSchema,
      isActive: z.boolean(),
    })
    .passthrough(),
);

export const modifierGroupLinkSchema = envelope(
  z.object({ groupId: z.string(), productId: z.string(), linked: z.boolean() }),
);

export const adminProductsForModifiersSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        isActive: z.boolean().optional(),
      })
      .passthrough(),
  ),
);

export const adminMediaListSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        productId: z.string().optional(),
        url: z.string().optional(),
        altText: z.string().nullable().optional(),
        displayOrder: z.number().optional(),
      })
      .passthrough(),
  ),
);

export const adminMediaSchema = envelope(
  z
    .object({
      id: z.string(),
      productId: z.string().optional(),
      url: z.string().optional(),
      altText: z.string().nullable().optional(),
      displayOrder: z.number().optional(),
    })
    .passthrough(),
);

const branchFields = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().optional(),
    addressLine: z.string().optional(),
    phone: z.string().nullable().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    isActive: z.boolean().optional(),
    isAcceptingOrders: z.boolean().optional(),
    pickupEnabled: z.boolean().optional(),
    deliveryEnabled: z.boolean().optional(),
    minOrderMinor: z.string().optional(),
    deliveryFeeMinor: z.string().optional(),
    estimatedDeliveryMinutesMin: z.number().optional(),
    estimatedDeliveryMinutesMax: z.number().optional(),
    status: z.string().optional(),
    administrator: z
      .object({
        userId: z.string(),
        displayName: z.string().nullable(),
        status: z.string(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const adminBranchesSchema = envelope(z.array(branchFields));

export const adminBranchSchema = envelope(branchFields);

export const serviceAreasSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        branchId: z.string().optional(),
        name: z.string().optional(),
        polygonGeoJson: z.unknown().optional(),
        polygon: z.unknown().optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      })
      .passthrough(),
  ),
);

export const operatingHoursSchema = envelope(
  z.array(
    z
      .object({
        dayOfWeek: z.number(),
        opensAt: z.string(),
        closesAt: z.string(),
        isClosed: z.boolean(),
      })
      .passthrough(),
  ),
);

export const productAvailabilityListSchema = envelope(
  z.array(
    z
      .object({
        productId: z.string(),
        name: z.string(),
        slug: z.string().optional(),
        isActive: z.boolean().optional(),
        isAvailable: z.boolean(),
        reason: z.string().nullable().optional(),
      })
      .passthrough(),
  ),
);

export const productAvailabilityPatchSchema = envelope(
  z
    .object({
      branchId: z.string(),
      productId: z.string(),
      isAvailable: z.boolean(),
      reason: z.string().nullable().optional(),
    })
    .passthrough(),
);

export const adminCustomersSchema = envelope(
  z.array(
    z
      .object({
        userId: z.string(),
        displayName: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        phoneVerified: z.boolean().optional(),
        email: z.string().nullable().optional(),
        emailVerified: z.boolean().optional(),
        status: z.string().optional(),
        createdAt: z.string().nullable().optional(),
        pointsBalance: z.string().optional(),
      })
      .passthrough(),
  ),
);

export const adminCustomerSchema = envelope(
  z
    .object({
      userId: z.string(),
      displayName: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      phoneVerified: z.boolean().optional(),
      email: z.string().nullable().optional(),
      emailVerified: z.boolean().optional(),
      status: z.string().optional(),
      createdAt: z.string().nullable().optional(),
      pointsBalance: z.string().optional(),
    })
    .passthrough(),
);

export const adminClubSnapshotSchema = envelope(
  z
    .object({
      programName: z.string(),
      points: z.string(),
      lifetimeEarnedPoints: z.string(),
      currentTier: z
        .object({
          code: z.string(),
          displayName: z.string(),
          minLifetimeEarnedPoints: z.string().optional(),
        })
        .passthrough(),
      nextTier: z
        .object({
          code: z.string(),
          displayName: z.string(),
        })
        .passthrough()
        .nullable(),
      pointsToNextTier: z.string().nullable(),
      progressBps: z.number().optional(),
      welcome: z
        .object({
          status: z.string(),
          promotionCode: z.string().nullable().optional(),
          discountMinor: z.string().nullable().optional(),
          expiresAt: z.string().nullable().optional(),
        })
        .passthrough(),
      activity: z
        .array(
          z
            .object({
              id: z.string(),
              entryType: z.string().optional(),
              pointsDelta: z.string().optional(),
              reason: z.string().nullable().optional(),
              createdAt: z.string().optional(),
            })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough(),
);

export const adminPromotionsSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        code: z.string().nullable().optional(),
        name: z.string().optional(),
        kind: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        isActive: z.boolean().optional(),
        active: z.boolean().optional(),
        discountMinor: z.string().nullable().optional(),
        discountPercentBps: z.number().nullable().optional(),
        minMerchandiseMinor: z.string().optional(),
        validFrom: z.string().nullable().optional(),
        validTo: z.string().nullable().optional(),
        firstOrderOnly: z.boolean().optional(),
        listedOnStorefront: z.boolean().optional(),
        usageLimitTotal: z.number().nullable().optional(),
        usageLimitPerCustomer: z.number().nullable().optional(),
        combinable: z.boolean().optional(),
        branchIds: z.array(z.string()).nullable().optional(),
      })
      .passthrough(),
  ),
);

export const adminPromotionSchema = envelope(
  z
    .object({
      id: z.string(),
      code: z.string().nullable().optional(),
      name: z.string().optional(),
      kind: z.string().optional(),
      type: z.string().optional(),
      isActive: z.boolean().optional(),
      discountMinor: z.string().nullable().optional(),
      discountPercentBps: z.number().nullable().optional(),
      minMerchandiseMinor: z.string().optional(),
      validFrom: z.string().nullable().optional(),
      validTo: z.string().nullable().optional(),
      branchIds: z.array(z.string()).nullable().optional(),
      usageLimitTotal: z.number().nullable().optional(),
      usageLimitPerCustomer: z.number().nullable().optional(),
      combinable: z.boolean().optional(),
      listedOnStorefront: z.boolean().optional(),
      firstOrderOnly: z.boolean().optional(),
    })
    .passthrough(),
);

export const adminPaymentsSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        checkoutSessionId: z.string().optional(),
        orderId: z.string().optional(),
        status: z.string().optional(),
        amountMinor: moneyMinorStringSchema.optional(),
        currency: z.string().optional(),
        providerPaymentId: z.string().optional(),
        providerRef: z.string().optional(),
        createdAt: z.string().optional(),
        orderDisplayNumber: z.string().nullable().optional(),
        paymentMethodCode: z.string().nullable().optional(),
        fulfillmentMode: z.string().nullable().optional(),
        provider: z.string().optional(),
      })
      .passthrough(),
  ),
);

export const adminPaymentSchema = envelope(
  z
    .object({
      id: z.string(),
      checkoutSessionId: z.string().optional(),
      orderId: z.string().optional(),
      status: z.string().optional(),
      amountMinor: moneyMinorStringSchema.optional(),
      currency: z.string().optional(),
      providerPaymentId: z.string().optional(),
    })
    .passthrough(),
);

export const adminRefundsSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        paymentId: z.string(),
        orderId: z.string().nullable().optional(),
        amountMinor: moneyMinorStringSchema,
        currency: z.string().optional(),
        status: z.string().optional(),
        reason: z.string().nullable().optional(),
        createdAt: z.union([z.string(), z.date()]).optional(),
      })
      .passthrough(),
  ),
);

export const adminUsersSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        displayName: z.string().nullable().optional(),
        primaryIdentifier: z.string().nullable().optional(),
        status: z.string().optional(),
        actorType: z.string().optional(),
        roleCodes: z.array(z.string()).optional(),
        permissionCodes: z.array(z.string()).optional(),
        customPermissionsEnabled: z.boolean().optional(),
        isBranchAdministrator: z.boolean().optional(),
        branchScopes: z
          .array(
            z.object({
              branchId: z.string(),
              branchCode: z.string(),
              branchName: z.string(),
              scopeKind: z.string(),
            }),
          )
          .optional(),
      })
      .passthrough(),
  ),
);

export const staffAccessSchema = envelope(
  z.object({
    userId: z.string(),
    permissions: z.array(z.string()),
    branchIds: z.array(z.string()),
    isSuperAdmin: z.boolean(),
  }),
);

export const adminRolesSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        permissionCodes: z.array(z.string()).nullable().optional(),
      })
      .passthrough(),
  ),
);

export const adminPermissionsSchema = envelope(
  z.array(
    z
      .object({
        id: z.string().optional(),
        code: z.string(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
      })
      .passthrough(),
  ),
);

export const adminAuditSchema = envelope(
  z.array(
    z
      .object({
        id: z.string(),
        action: z.string().optional(),
        actorUserId: z.string().nullable().optional(),
        actorId: z.string().nullable().optional(),
        actorType: z.string().optional(),
        resourceType: z.string().nullable().optional(),
        resourceId: z.string().nullable().optional(),
        branchId: z.string().nullable().optional(),
        requestId: z.string().nullable().optional(),
        reason: z.string().nullable().optional(),
        createdAt: z.string().optional(),
      })
      .passthrough(),
  ),
);

export const adminSettingsSchema = envelope(
  z.array(
    z
      .object({
        key: z.string(),
        valueJson: z.unknown().optional(),
        valueType: z.string().optional(),
        category: z.string().optional(),
        description: z.string().nullable().optional(),
        mutable: z.boolean().optional(),
        updatedAt: z.string().optional(),
      })
      .passthrough(),
  ),
);

export const adminRoleAssignSchema = envelope(
  z
    .object({
      ok: z.boolean().optional(),
      userId: z.string(),
      roleId: z.string(),
    })
    .passthrough(),
);

export const staffVerificationLinkSchema = envelope(
  z.object({ userId: z.string(), token: z.string(), expiresAt: z.string() }),
);

export const staffUserMutationSchema = envelope(
  z
    .object({
      ok: z.boolean().optional(),
      userId: z.string(),
      status: z.string().optional(),
      roleId: z.string().optional(),
    })
    .passthrough(),
);

export const adminSettingPatchSchema = envelope(
  z
    .object({
      key: z.string(),
      valueJson: z.unknown().optional(),
    })
    .passthrough(),
);

export const pickupTokenSchema = z
  .object({
    token: z.string(),
    prefix: z.string(),
    expiresAt: z.string(),
    order: z
      .object({
        id: z.string(),
        displayNumber: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const pickupTokenResponseSchema = envelope(pickupTokenSchema);
export const pickupTokenScanResponseSchema = envelope(
  z
    .object({
      orderId: z.string(),
      displayNumber: z.string().nullable().optional(),
      consumedAt: z.string().nullable().optional(),
      courierId: z.string(),
    })
    .passthrough(),
);
