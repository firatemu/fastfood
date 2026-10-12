import { moneyMinorStringSchema, uuidSchema } from '@fastfood/contracts';
import { z } from 'zod';

/** Lenient success envelope — some admin/order endpoints omit meta. */
export function envelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z
      .object({
        requestId: z.string().optional(),
        pagination: z
          .object({
            page: z.number(),
            pageSize: z.number(),
            totalItems: z.number(),
            totalPages: z.number(),
          })
          .optional(),
      })
      .passthrough()
      .optional(),
  });
}

export const categorySchema = z.object({
  id: uuidSchema,
  parentCategoryId: uuidSchema.nullable(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  displayOrder: z.number(),
  isActive: z.boolean(),
});

export const productSchema = z.object({
  id: uuidSchema,
  categoryId: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePriceMinor: moneyMinorStringSchema,
  currency: z.string(),
  displayOrder: z.number(),
  isActive: z.boolean(),
});

export const productMediaSchema = z.object({
  url: z.string(),
  altText: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
});

export const storefrontModifierSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  priceDeltaMinor: moneyMinorStringSchema,
});

export const storefrontModifierGroupSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  selectionMin: z.number(),
  selectionMax: z.number(),
  modifiers: z.array(storefrontModifierSchema),
});

export const productVariantSchema = z.object({
  id: uuidSchema,
  sku: z.string(),
  name: z.string(),
  priceMinor: moneyMinorStringSchema,
  displayOrder: z.number(),
});

export const ingredientRemovalOptionSchema = z.object({
  id: uuidSchema,
  name: z.string(),
});

export const productAllergenRefSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
});

export const productRecommendationSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  basePriceMinor: moneyMinorStringSchema,
  currency: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable().optional(),
});

export const productDetailSchema = productSchema.extend({
  media: z.array(productMediaSchema).default([]),
  modifierGroups: z.array(storefrontModifierGroupSchema).default([]),
  allergenIds: z.array(uuidSchema).default([]),
  allergens: z.array(productAllergenRefSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
  removalOptions: z.array(ingredientRemovalOptionSchema).default([]),
  categoryName: z.string().nullable().optional(),
  categorySlug: z.string().nullable().optional(),
  isAvailable: z.boolean().default(true),
  kcal: z.number().nullable().optional(),
  proteinGrams: z.number().nullable().optional(),
  weightGrams: z.number().nullable().optional(),
  volumeMl: z.number().nullable().optional(),
  spiceLevel: z.number().nullable().optional(),
  badge: z.string().nullable().optional(),
  eyebrow: z.string().nullable().optional(),
  averageRatingBps: z.number().nullable().optional(),
  ratingCount: z.number().optional(),
  recommendations: z.array(productRecommendationSchema).default([]),
});

export const allergenSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const orderTimelineEventSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    occurredAt: z.string().optional(),
    label: z.string().optional(),
  })
  .passthrough();

export const branchSchema = z.object({
  id: uuidSchema,
  code: z.string().optional(),
  name: z.string(),
  addressLine: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isAcceptingOrders: z.boolean(),
  minOrderMinor: moneyMinorStringSchema.optional(),
  deliveryFeeMinor: moneyMinorStringSchema.optional(),
  estimatedDeliveryMinutesMin: z.number().optional(),
  estimatedDeliveryMinutesMax: z.number().optional(),
  storyBody: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  hours: z
    .array(
      z.object({
        dayOfWeek: z.number(),
        opensAt: z.string(),
        closesAt: z.string(),
        isClosed: z.boolean(),
      }),
    )
    .optional(),
});

export const cartLineSchema = z.object({
  id: z.string(),
  productId: uuidSchema,
  productVariantId: uuidSchema.nullable().optional(),
  quantity: z.number(),
  unitPriceMinorSnapshot: moneyMinorStringSchema,
  currencySnapshot: z.string(),
  deliveryNote: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
  productName: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  variantName: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string(),
        name: z.string().nullable().optional(),
        priceDeltaMinorSnapshot: moneyMinorStringSchema,
      }),
    )
    .default([]),
  removals: z
    .array(
      z.object({
        ingredientId: z.string(),
        name: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

export const cartSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  guestSessionId: z.string().nullable().optional(),
  status: z.string(),
  branchId: z.string().nullable().optional(),
  lineItems: z.array(cartLineSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const checkoutQuoteSchema = z
  .object({
    currency: z.string(),
    merchandiseGrossSubtotalMinor: moneyMinorStringSchema,
    productDiscountTotalMinor: moneyMinorStringSchema,
    cartDiscountTotalMinor: moneyMinorStringSchema,
    merchandiseNetSubtotalMinor: moneyMinorStringSchema,
    minimumOrderEligible: z.boolean(),
    deliveryFeeMinor: moneyMinorStringSchema,
    payableBeforeLoyaltyMinor: moneyMinorStringSchema,
    loyaltyRedeemedMinor: moneyMinorStringSchema,
    finalPayableMinor: moneyMinorStringSchema,
    branchId: z.string().optional(),
    serviceAreaId: z.string().nullable().optional(),
    promotionId: z.string().nullable().optional(),
    checkoutSessionId: z.string().optional(),
    fulfillmentMode: z.enum(['DELIVERY', 'PICKUP']).optional(),
    branchName: z.string().optional(),
    branchAddressLine: z.string().optional(),
    etaMinutesMin: z.number().optional(),
    etaMinutesMax: z.number().optional(),
    pickupDiscountMinor: moneyMinorStringSchema.optional(),
    pickupDiscountBps: z.number().optional(),
    tipMinor: moneyMinorStringSchema.optional(),
    scheduledFor: z.string().nullable().optional(),
    ecoPackaging: z.boolean().optional(),
    contactless: z.boolean().optional(),
    validationErrors: z.array(z.string()).optional(),
    paymentMethods: z
      .array(
        z.object({
          code: z.string(),
          label: z.string(),
          available: z.boolean(),
          disabledReason: z.string().nullable().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

export const paymentInitSchema = z.object({
  attemptId: z.string(),
  checkoutSessionId: z.string(),
  provider: z.string(),
  providerPaymentId: z.string().nullable().optional(),
  status: z.string(),
  redirectUrl: z.string().nullable().optional(),
  amountMinor: moneyMinorStringSchema,
  currency: z.string(),
  replayed: z.boolean().optional(),
  branchId: z.string().optional(),
});

export const paymentStatusSchema = z.object({
  checkoutSessionId: z.string(),
  attemptId: z.string(),
  providerPaymentId: z.string().nullable().optional(),
  status: z.string(),
  amountMinor: moneyMinorStringSchema,
  currency: z.string(),
  orderId: z.string().nullable().optional(),
});

export const orderSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    finalPayableMinor: moneyMinorStringSchema.optional(),
    currency: z.string().optional(),
    merchandiseNetMinor: moneyMinorStringSchema.optional(),
    deliveryFeeMinor: moneyMinorStringSchema.optional(),
    items: z.array(z.unknown()).optional(),
    events: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const serviceabilitySchema = z.object({
  serviceable: z.boolean(),
  branchId: z.string().nullable().optional(),
  serviceAreaId: z.string().nullable().optional(),
});

export const promotionValidateSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  discountMinor: moneyMinorStringSchema.nullable().optional(),
  discountPercentBps: z.number().nullable().optional(),
  minMerchandiseMinor: moneyMinorStringSchema,
  combinable: z.boolean(),
});

export const customerAddressSchema = z
  .object({
    id: z.string(),
    label: z.string().nullable().optional(),
    recipientName: z.string(),
    recipientPhone: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    provinceId: z.number().int().nullable().optional(),
    districtId: z.number().int().nullable().optional(),
    neighborhoodId: z.number().int().nullable().optional(),
    province: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    avenue: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    buildingNumber: z.string().nullable().optional(),
    floor: z.string().nullable().optional(),
    apartmentNumber: z.string().nullable().optional(),
    floorApartment: z.string().nullable().optional(),
    accessCode: z.string().nullable().optional(),
    deliveryNote: z.string().nullable().optional(),
    isDefault: z.boolean().optional(),
  })
  .passthrough();

export const loyaltyBalanceSchema = z.object({
  userId: z.string(),
  points: z.string(),
});

export const categoriesResponseSchema = envelope(z.array(categorySchema));
export const productsResponseSchema = envelope(z.array(productSchema));
export const productDetailResponseSchema = envelope(productDetailSchema);
export const allergensResponseSchema = envelope(z.array(allergenSchema));
export const orderTimelineResponseSchema = envelope(z.array(orderTimelineEventSchema));
export const addressMutationResponseSchema = envelope(customerAddressSchema);
export const addressGeographyOptionsResponseSchema = envelope(
  z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      centerLatitude: z.number().optional(),
      centerLongitude: z.number().optional(),
    }),
  ),
);
export const okResponseSchema = envelope(z.object({ ok: z.boolean() }));
export const branchesResponseSchema = envelope(z.array(branchSchema));
export const cartResponseSchema = envelope(cartSchema);
export const quoteResponseSchema = envelope(checkoutQuoteSchema);
export const cartQuoteSchema = z.object({
  currency: z.string(),
  subtotalMinor: moneyMinorStringSchema,
  lineSubtotals: z.array(moneyMinorStringSchema),
});
export const cartQuoteResponseSchema = envelope(cartQuoteSchema);
export const paymentInitResponseSchema = envelope(paymentInitSchema);
export const paymentStatusResponseSchema = envelope(paymentStatusSchema);
export const checkoutSlotsSchema = z.object({
  timezone: z.string(),
  prepMinutes: z.number(),
  slots: z.array(z.object({ startAt: z.string(), label: z.string() })),
});
export const checkoutSlotsResponseSchema = envelope(checkoutSlotsSchema);
export const paymentMethodsResponseSchema = envelope(
  z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      available: z.boolean(),
      disabledReason: z.string().nullable().optional(),
    }),
  ),
);
export const orderConfirmationSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    checkoutSessionId: z.string().nullable().optional(),
    currency: z.string(),
    fulfillmentMode: z.string().optional(),
    scheduledFor: z.string().nullable().optional(),
    tipMinor: moneyMinorStringSchema.optional(),
    pickupDiscountMinor: moneyMinorStringSchema.optional(),
    ecoPackaging: z.boolean().optional(),
    contactless: z.boolean().optional(),
    merchandiseNetMinor: moneyMinorStringSchema.optional(),
    deliveryFeeMinor: moneyMinorStringSchema.optional(),
    loyaltyRedeemedMinor: moneyMinorStringSchema.optional(),
    finalPayableMinor: moneyMinorStringSchema,
    deliveryAddress: z.unknown().nullable().optional(),
    branch: z
      .object({
        id: z.string(),
        name: z.string(),
        addressLine: z.string().optional(),
        etaMinutesMin: z.number().optional(),
        etaMinutesMax: z.number().optional(),
      })
      .nullable()
      .optional(),
    items: z.array(z.unknown()).optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();
export const orderConfirmationResponseSchema = envelope(orderConfirmationSchema);
export const orderResponseSchema = envelope(orderSchema);
export const ordersListResponseSchema = envelope(z.array(orderSchema));
export const serviceabilityResponseSchema = envelope(serviceabilitySchema);
export const promotionValidateResponseSchema = envelope(promotionValidateSchema);
export const addressesResponseSchema = envelope(z.array(customerAddressSchema));
export const loyaltyResponseSchema = envelope(loyaltyBalanceSchema);
export const otpRequestResponseSchema = envelope(z.object({ expiresAt: z.string() }));
export const authSessionResponseSchema = envelope(
  z.object({
    customerId: z.string(),
    refreshToken: z.string(),
    refreshExpiresAt: z.string(),
  }),
);
export const otpVerifyResponseSchema = authSessionResponseSchema;
export const authMethodsResponseSchema = envelope(
  z.object({
    otp: z.boolean(),
    password: z.boolean(),
    google: z.boolean(),
    apple: z.boolean(),
  }),
);
export const oauthStartResponseSchema = envelope(
  z.object({
    authorizationUrl: z.string(),
    configured: z.boolean().optional(),
  }),
);
export const identitiesResponseSchema = envelope(
  z.object({
    phoneVerified: z.boolean(),
    emailVerified: z.boolean(),
    hasPassword: z.boolean(),
    identities: z.array(
      z.object({
        provider: z.string(),
        emailNormalized: z.string().nullable(),
      }),
    ),
  }),
);
export const customerProfileSchema = z
  .object({
    id: z.string(),
    displayName: z.string().nullable(),
    phone: z.string().nullable().optional(),
    phoneVerified: z.boolean().optional(),
    email: z.string().nullable().optional(),
    emailVerified: z.boolean().optional(),
    locale: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
  })
  .passthrough();
export const customerProfileResponseSchema = envelope(customerProfileSchema);
export const customerPreferenceSchema = z.object({
  marketingOptIn: z.boolean(),
  newsletterOptIn: z.boolean(),
  orderUpdatesOptIn: z.boolean(),
  kvkkAcceptedAt: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
});
export const customerPreferenceResponseSchema = envelope(customerPreferenceSchema);
export const customerOrderSchema = z
  .object({
    id: z.string(),
    displayNumber: z.string().optional(),
    status: z.string(),
    statusLabel: z.string().optional(),
    trackerKind: z.string().optional(),
    fulfillmentMode: z.enum(['DELIVERY', 'PICKUP']).optional(),
    createdAt: z.union([z.string(), z.coerce.date()]).optional(),
    finalPayableMinor: moneyMinorStringSchema.optional(),
    currency: z.string().optional(),
    itemSummary: z.string().optional(),
    itemCount: z.number().optional(),
    branch: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
    trackingAvailable: z.boolean().optional(),
    reorderAvailable: z.boolean().optional(),
  })
  .passthrough();
export const customerOrdersResponseSchema = envelope(z.array(customerOrderSchema));

export const customerEtaSchema = z.object({
  kind: z.enum(['delivery', 'pickup', 'none']),
  remainingMinutes: z.number().nullable(),
  estimatedAt: z.string().nullable(),
  source: z.string(),
});

export const customerCourierSchema = z
  .object({
    displayName: z.string(),
    vehicleType: z.string().nullable(),
    callAvailable: z.boolean(),
    chatAvailable: z.boolean(),
  })
  .nullable();

export const customerLocationSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
    recordedAt: z.string(),
    accuracyM: z.number().nullable(),
    freshness: z.enum(['current', 'stale', 'unavailable']),
  })
  .nullable();

export const orderTrackingSchema = z
  .object({
    id: z.string(),
    displayNumber: z.string(),
    status: z.string(),
    statusLabel: z.string(),
    trackerKind: z.string(),
    stepperIndex: z.number(),
    stages: z.array(
      z.object({
        index: z.number(),
        key: z.string(),
        label: z.string(),
        state: z.string(),
      }),
    ),
    fulfillmentMode: z.enum(['DELIVERY', 'PICKUP']),
    createdAt: z.string(),
    scheduledFor: z.string().nullable(),
    currency: z.string(),
    merchandiseNetMinor: moneyMinorStringSchema,
    deliveryFeeMinor: moneyMinorStringSchema,
    finalPayableMinor: moneyMinorStringSchema,
    trackingActive: z.boolean(),
    eta: customerEtaSchema,
    branch: z
      .object({
        id: z.string(),
        name: z.string(),
        addressLine: z.string(),
        etaMinutesMin: z.number(),
        etaMinutesMax: z.number(),
      })
      .nullable(),
    courier: customerCourierSchema,
    location: customerLocationSchema,
    destination: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        line1: z.string().nullable(),
      })
      .nullable(),
    timeline: z.array(
      z.object({
        eventType: z.string(),
        fromStatus: z.string().nullable(),
        toStatus: z.string().nullable(),
        createdAt: z.string(),
        customerReason: z.string().nullable(),
      }),
    ),
    items: z.array(
      z.object({
        id: z.string(),
        productId: z.string(),
        productName: z.string(),
        quantity: z.number(),
        unitPriceMinor: moneyMinorStringSchema,
        lineGrossMinor: moneyMinorStringSchema,
      }),
    ),
    pollIntervalMs: z.number().nullable(),
  })
  .passthrough();
export const orderTrackingResponseSchema = envelope(orderTrackingSchema);
export const courierLocationResponseSchema = envelope(
  z.object({
    latitude: z.number(),
    longitude: z.number(),
    recordedAt: z.string(),
    accuracyM: z.number().nullable(),
    freshness: z.enum(['current', 'stale', 'unavailable']),
  }),
);

export const reorderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  outcome: z.string(),
  historicalUnitPriceMinor: moneyMinorStringSchema,
  currentUnitPriceMinor: moneyMinorStringSchema.nullable(),
  message: z.string(),
});
export const reorderResultSchema = z.object({
  status: z.enum(['success', 'partial', 'unavailable']),
  cartId: z.string().nullable(),
  restoredCount: z.number(),
  reviewCount: z.number(),
  unavailableCount: z.number(),
  items: z.array(reorderItemSchema),
});
export const reorderResponseSchema = envelope(reorderResultSchema);

export const favoriteProductSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    currency: z.string(),
    basePriceMinor: moneyMinorStringSchema,
    isActive: z.boolean(),
    isAvailable: z.boolean(),
    imageUrl: z.string().nullable(),
  })
  .nullable();
export const favoriteSchema = z.object({
  id: z.string(),
  productId: z.string(),
  createdAt: z.string(),
  product: favoriteProductSchema,
});
export const favoritesResponseSchema = envelope(z.array(favoriteSchema));
export const favoriteResponseSchema = envelope(favoriteSchema);

export const homeHoursSchema = z.object({
  dayOfWeek: z.number(),
  opensAt: z.string(),
  closesAt: z.string(),
  isClosed: z.boolean(),
});

export const homeHeroSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  hint: z.string().nullable(),
});

export const vitrineProductSchema = z.object({
  id: uuidSchema,
  categoryId: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePriceMinor: moneyMinorStringSchema,
  currency: z.string(),
  displayOrder: z.number(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  isFeatured: z.boolean(),
  isHero: z.boolean(),
  isAvailable: z.boolean(),
  kcal: z.number().nullable(),
  proteinGrams: z.number().nullable(),
  weightGrams: z.number().nullable(),
  volumeMl: z.number().nullable(),
  spiceLevel: z.number().nullable(),
  badge: z.string().nullable(),
  accentLabel: z.string().nullable(),
  eyebrow: z.string().nullable(),
  heroDescription: z.string().nullable(),
  heroImageUrl: z.string().nullable(),
  soldCount: z.number(),
  averageRatingBps: z.number().nullable(),
  ratingCount: z.number(),
  heroSpecs: z.array(homeHeroSpecSchema),
});

export const homeCategorySchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  productCount: z.number(),
});

export const homeComboSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  bundlePriceMinor: moneyMinorStringSchema,
  compareAtMinor: moneyMinorStringSchema.nullable(),
  currency: z.string(),
  endsAt: z.string().nullable(),
  savingsPercent: z.number().nullable(),
  expired: z.boolean(),
  items: z.array(
    z.object({
      productId: uuidSchema,
      quantity: z.number(),
      name: z.string(),
    }),
  ),
});

export const homeReviewSchema = z.object({
  id: uuidSchema,
  authorDisplayName: z.string(),
  authorInitials: z.string(),
  body: z.string(),
  rating: z.number(),
  branchLabel: z.string().nullable(),
  publishedAt: z.string(),
});

export const homePayloadSchema = z.object({
  branch: z
    .object({
      id: uuidSchema,
      name: z.string(),
      addressLine: z.string(),
      phone: z.string().nullable().optional(),
      isAcceptingOrders: z.boolean(),
      estimatedDeliveryMinutesMin: z.number(),
      estimatedDeliveryMinutesMax: z.number(),
      hours: z.array(homeHoursSchema),
    })
    .nullable(),
  kitchenLiveCount: z.number(),
  hero: vitrineProductSchema.nullable(),
  heroSlides: z.array(vitrineProductSchema).optional(),
  heroSliderSettings: z
    .object({
      transitionDurationSeconds: z.number().int().min(2).max(30),
      loop: z.boolean(),
    })
    .optional(),
  categories: z.array(homeCategorySchema),
  products: z.array(vitrineProductSchema),
  combo: homeComboSchema.nullable(),
  reviews: z.array(homeReviewSchema),
  socialProof: z.object({
    averageRatingBps: z.number().nullable(),
    reviewCount: z.number(),
    happyCustomerCount: z.number(),
  }),
  builderAvailable: z.boolean(),
});

export const homeResponseSchema = envelope(homePayloadSchema);
export const newsletterResponseSchema = envelope(
  z.object({
    email: z.string(),
    alreadySubscribed: z.boolean(),
  }),
);

export const clubTierSchema = z.object({
  code: z.string(),
  displayName: z.string(),
  minLifetimeEarnedPoints: z.string(),
});

export const clubActivitySchema = z.object({
  id: z.string(),
  entryType: z.string(),
  pointsDelta: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export const clubSnapshotSchema = z
  .object({
    programName: z.string(),
    points: z.string(),
    lifetimeEarnedPoints: z.string(),
    currentTier: clubTierSchema,
    nextTier: clubTierSchema.nullable(),
    pointsToNextTier: z.string().nullable(),
    progressBps: z.number(),
    welcome: z.object({
      status: z.string(),
      promotionCode: z.string().nullable(),
      discountMinor: z.string().nullable(),
      expiresAt: z.string().nullable(),
    }),
    activity: z.array(clubActivitySchema),
  })
  .passthrough();
export const clubResponseSchema = envelope(clubSnapshotSchema);

export const spinEligibilitySchema = z
  .object({
    campaign: z.object({ id: z.string(), name: z.string(), endsAt: z.string() }).nullable(),
    eligible: z.boolean(),
    reason: z.string(),
    spinsRemaining: z.number(),
    lastPlay: z.unknown().nullable(),
    prizes: z.array(z.object({ code: z.string(), label: z.string(), kind: z.string() })),
  })
  .passthrough();
export const spinEligibilityResponseSchema = envelope(spinEligibilitySchema);
export const spinPlaySchema = z
  .object({
    playId: z.string(),
    campaignId: z.string(),
    periodKey: z.string(),
    prize: z.object({
      code: z.string(),
      label: z.string(),
      kind: z.string(),
      pointsAwarded: z.string(),
      couponCode: z.string().nullable(),
    }),
    replayed: z.boolean(),
  })
  .passthrough();
export const spinPlayResponseSchema = envelope(spinPlaySchema);

export const notificationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string(),
});
export const notificationsResponseSchema = envelope(
  z.object({
    items: z.array(notificationItemSchema),
    unreadCount: z.number(),
  }),
);
export const notificationItemResponseSchema = envelope(notificationItemSchema);

export const supportMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderType: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export const supportConversationSchema = z
  .object({
    id: z.string(),
    orderId: z.string().nullable().optional(),
    status: z.string(),
    createdAt: z.string(),
    closedAt: z.string().nullable().optional(),
    messages: z.array(supportMessageSchema).optional(),
  })
  .passthrough();
export const supportConversationResponseSchema = envelope(supportConversationSchema);
export const supportConversationsResponseSchema = envelope(z.array(supportConversationSchema));
export const supportMessageResponseSchema = envelope(supportMessageSchema);

export const diningTableSchema = z.object({
  publicCode: z.string(),
  label: z.string(),
  branchId: z.string(),
  branchName: z.string(),
  isActive: z.boolean(),
});
export const diningTableResponseSchema = envelope(diningTableSchema);

export const publicDealSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  headline: z.string(),
  description: z.string().nullable(),
  kind: z.string(),
  discountSummary: z.string(),
  discountMinor: moneyMinorStringSchema.nullable().optional(),
  discountPercentBps: z.number().nullable().optional(),
  minMerchandiseMinor: moneyMinorStringSchema,
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  firstOrderOnly: z.boolean(),
  branchRestricted: z.boolean(),
  eligibility: z.enum(['eligible', 'first_order_only', 'expired']),
});
export const publicDealsResponseSchema = envelope(z.array(publicDealSchema));

export const contentSectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  body: z.string(),
});
export const storefrontContentSchema = z.object({
  slug: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  sections: z.array(contentSectionSchema),
  effectiveAt: z.string().nullable(),
  displayOrder: z.number(),
});
export const storefrontContentResponseSchema = envelope(storefrontContentSchema);
export const storefrontContentListResponseSchema = envelope(z.array(storefrontContentSchema));
