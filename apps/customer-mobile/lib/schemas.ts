import { z } from 'zod';

/** Loose success envelope — some API routes omit `meta` today. */
function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    meta: z.unknown().optional(),
  });
}

export const categorySchema = z.object({
  id: z.string(),
  parentCategoryId: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  displayOrder: z.number(),
  isActive: z.boolean(),
});

export const productSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePriceMinor: z.string(),
  currency: z.string(),
  displayOrder: z.number(),
  isActive: z.boolean(),
});

export const categoriesResponseSchema = envelope(z.array(categorySchema));
export const productsResponseSchema = envelope(z.array(productSchema));
export const productResponseSchema = envelope(productSchema);

export const cartLineModifierSchema = z.object({
  modifierId: z.string(),
  name: z.string().nullable().optional(),
  priceDeltaMinorSnapshot: z.string(),
});

export const cartLineRemovalSchema = z.object({
  ingredientId: z.string(),
  name: z.string().nullable().optional(),
});

export const cartLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productVariantId: z.string().nullable().optional(),
  quantity: z.number(),
  unitPriceMinorSnapshot: z.string(),
  currencySnapshot: z.string(),
  deliveryNote: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
  productName: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  variantName: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
  modifiers: z.array(cartLineModifierSchema).default([]),
  removals: z.array(cartLineRemovalSchema).default([]),
});

export const cartSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  guestSessionId: z.string().nullable().optional(),
  status: z.string(),
  branchId: z.string().nullable().optional(),
  lineItems: z.array(cartLineSchema),
});

export const cartResponseSchema = envelope(cartSchema);

export const otpRequestResponseSchema = envelope(
  z.object({
    expiresAt: z.string(),
  }),
);

export const otpVerifyResponseSchema = envelope(
  z.object({
    customerId: z.string(),
    refreshToken: z.string(),
    refreshExpiresAt: z.string(),
  }),
);

export const orderSchema = z.object({
  id: z.string(),
  status: z.string(),
  merchandiseNetMinor: z.string().optional(),
  deliveryFeeMinor: z.string().optional(),
  finalPayableMinor: z.string().optional(),
  currency: z.string().optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
});

export const ordersResponseSchema = envelope(z.array(orderSchema));
export const orderResponseSchema = envelope(orderSchema);

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
  id: z.string(),
  categoryId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePriceMinor: z.string(),
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
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  productCount: z.number(),
});

export const homeComboSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  bundlePriceMinor: z.string(),
  compareAtMinor: z.string().nullable(),
  currency: z.string(),
  endsAt: z.string().nullable(),
  savingsPercent: z.number().nullable(),
  expired: z.boolean(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number(),
      name: z.string(),
    }),
  ),
});

export const homeReviewSchema = z.object({
  id: z.string(),
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
      id: z.string(),
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

export const productMediaSchema = z.object({
  url: z.string(),
  altText: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
});

export const storefrontModifierSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceDeltaMinor: z.string(),
});

export const storefrontModifierGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  selectionMin: z.number(),
  selectionMax: z.number(),
  modifiers: z.array(storefrontModifierSchema),
});

export const productVariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  priceMinor: z.string(),
  displayOrder: z.number(),
});

export const ingredientRemovalOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const productAllergenRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const productRecommendationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  basePriceMinor: z.string(),
  currency: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable().optional(),
});

export const productDetailSchema = productSchema.extend({
  media: z.array(productMediaSchema).default([]),
  modifierGroups: z.array(storefrontModifierGroupSchema).default([]),
  allergenIds: z.array(z.string()).default([]),
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

export const productDetailResponseSchema = envelope(productDetailSchema);

export const cartQuoteSchema = z.object({
  currency: z.string(),
  subtotalMinor: z.string(),
  lineSubtotals: z.array(z.string()),
});

export const cartQuoteResponseSchema = envelope(cartQuoteSchema);

export const promotionValidateSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  discountMinor: z.string().nullable().optional(),
  discountPercentBps: z.number().nullable().optional(),
  minMerchandiseMinor: z.string(),
  combinable: z.boolean(),
});

export const promotionValidateResponseSchema = envelope(promotionValidateSchema);

export const branchSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  addressLine: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional(),
  isAcceptingOrders: z.boolean(),
  estimatedDeliveryMinutesMin: z.number().optional(),
  estimatedDeliveryMinutesMax: z.number().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  phone: z.string().nullable().optional(),
  storyBody: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  hours: z.array(homeHoursSchema).optional(),
});

export const branchesResponseSchema = envelope(z.array(branchSchema));

export const publicDealSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  headline: z.string(),
  description: z.string().nullable(),
  kind: z.string(),
  discountSummary: z.string(),
  discountMinor: z.string().nullable().optional(),
  discountPercentBps: z.number().nullable().optional(),
  minMerchandiseMinor: z.string(),
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

export const catalogAllergenSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});
export const allergensResponseSchema = envelope(z.array(catalogAllergenSchema));

export const serviceabilityBranchOptionSchema = z.object({
  branchId: z.string(),
  branchName: z.string().optional(),
  serviceAreaId: z.string().optional(),
  priority: z.number().optional(),
});

export const serviceabilitySchema = z.object({
  serviceable: z.boolean(),
  branchId: z.string().nullable().optional(),
  serviceAreaId: z.string().nullable().optional(),
  branches: z.array(serviceabilityBranchOptionSchema).optional(),
});
export const serviceabilityResponseSchema = envelope(serviceabilitySchema);

export const paymentMethodSchema = z.object({
  code: z.string(),
  label: z.string(),
  available: z.boolean(),
  disabledReason: z.string().nullable().optional(),
});
export const paymentMethodsResponseSchema = envelope(z.array(paymentMethodSchema));

export const checkoutSlotsSchema = z.object({
  timezone: z.string(),
  prepMinutes: z.number(),
  slots: z.array(z.object({ startAt: z.string(), label: z.string() })),
});
export const checkoutSlotsResponseSchema = envelope(checkoutSlotsSchema);

export const checkoutQuoteSchema = z
  .object({
    currency: z.string(),
    merchandiseGrossSubtotalMinor: z.string(),
    productDiscountTotalMinor: z.string(),
    cartDiscountTotalMinor: z.string(),
    merchandiseNetSubtotalMinor: z.string(),
    minimumOrderEligible: z.boolean(),
    deliveryFeeMinor: z.string(),
    payableBeforeLoyaltyMinor: z.string(),
    loyaltyRedeemedMinor: z.string(),
    finalPayableMinor: z.string(),
    checkoutSessionId: z.string().optional(),
    fulfillmentMode: z.enum(['DELIVERY', 'PICKUP']).optional(),
    branchId: z.string().optional(),
    branchName: z.string().optional(),
    branchAddressLine: z.string().optional(),
    etaMinutesMin: z.number().optional(),
    etaMinutesMax: z.number().optional(),
    pickupDiscountMinor: z.string().optional(),
    pickupDiscountBps: z.number().optional(),
    tipMinor: z.string().optional(),
    scheduledFor: z.string().nullable().optional(),
    ecoPackaging: z.boolean().optional(),
    contactless: z.boolean().optional(),
    paymentMethods: z.array(paymentMethodSchema).optional(),
    validationErrors: z.array(z.string()).optional(),
    serviceAreaId: z.string().nullable().optional(),
    promotionId: z.string().nullable().optional(),
    serviceableBranches: z
      .array(
        z.object({
          branchId: z.string(),
          branchName: z.string(),
          branchAddressLine: z.string().optional(),
          serviceAreaId: z.string(),
          priority: z.number(),
          distanceKm: z.number().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();
export const quoteResponseSchema = envelope(checkoutQuoteSchema);

export const paymentInitSchema = z.object({
  attemptId: z.string(),
  checkoutSessionId: z.string(),
  provider: z.string(),
  providerPaymentId: z.string().nullable().optional(),
  status: z.string(),
  redirectUrl: z.string().nullable().optional(),
  amountMinor: z.string(),
  currency: z.string(),
  replayed: z.boolean().optional(),
  branchId: z.string().optional(),
});
export const paymentInitResponseSchema = envelope(paymentInitSchema);

export const paymentStatusSchema = z.object({
  checkoutSessionId: z.string(),
  attemptId: z.string(),
  providerPaymentId: z.string().nullable().optional(),
  status: z.string(),
  amountMinor: z.string(),
  currency: z.string(),
  orderId: z.string().nullable().optional(),
});
export const paymentStatusResponseSchema = envelope(paymentStatusSchema);

export const loyaltyBalanceSchema = z.object({
  userId: z.string().optional(),
  points: z.string(),
});
export const loyaltyResponseSchema = envelope(loyaltyBalanceSchema);

export const orderConfirmationSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    currency: z.string(),
    fulfillmentMode: z.string().optional(),
    scheduledFor: z.string().nullable().optional(),
    finalPayableMinor: z.string(),
    merchandiseNetMinor: z.string().optional(),
    deliveryFeeMinor: z.string().optional(),
    tipMinor: z.string().optional(),
    pickupDiscountMinor: z.string().optional(),
    items: z.array(z.unknown()).optional(),
    createdAt: z.string().optional(),
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
  })
  .passthrough();
export const orderConfirmationResponseSchema = envelope(orderConfirmationSchema);

export const okResponseSchema = envelope(z.object({ ok: z.boolean() }));
export const authSessionSchema = z.object({
  customerId: z.string(),
  refreshToken: z.string(),
  refreshExpiresAt: z.string(),
});
export const authSessionResponseSchema = otpVerifyResponseSchema;
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
export const accountDeletionResponseSchema = envelope(z.object({ deleted: z.literal(true) }));
export const customerPreferenceSchema = z.object({
  marketingOptIn: z.boolean(),
  newsletterOptIn: z.boolean(),
  orderUpdatesOptIn: z.boolean(),
  kvkkAcceptedAt: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
});
export const customerPreferenceResponseSchema = envelope(customerPreferenceSchema);
export const customerAddressSchema = z
  .object({
    id: z.string(),
    label: z.string().nullable().optional(),
    recipientName: z.string(),
    recipientPhone: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    countryCode: z.string().optional(),
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
export const addressesResponseSchema = envelope(z.array(customerAddressSchema));
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

export const customerOrderSchema = z
  .object({
    id: z.string(),
    displayNumber: z.string().optional(),
    status: z.string(),
    statusLabel: z.string().optional(),
    trackerKind: z.string().optional(),
    fulfillmentMode: z.enum(['DELIVERY', 'PICKUP']).optional(),
    createdAt: z.string().optional(),
    finalPayableMinor: z.string().optional(),
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
    merchandiseNetMinor: z.string(),
    deliveryFeeMinor: z.string(),
    finalPayableMinor: z.string(),
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
        unitPriceMinor: z.string(),
        lineGrossMinor: z.string(),
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
  historicalUnitPriceMinor: z.string(),
  currentUnitPriceMinor: z.string().nullable(),
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
    basePriceMinor: z.string(),
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

export type VitrineProduct = z.infer<typeof vitrineProductSchema>;
export type StorefrontHome = z.infer<typeof homePayloadSchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type PromotionValidate = z.infer<typeof promotionValidateSchema>;
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;
export type PaymentInit = z.infer<typeof paymentInitSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type Branch = z.infer<typeof branchSchema>;
export type OrderConfirmation = z.infer<typeof orderConfirmationSchema>;
export type AuthSessionPayload = z.infer<typeof authSessionSchema>;
export type CustomerProfile = z.infer<typeof customerProfileSchema>;
export type CustomerPreference = z.infer<typeof customerPreferenceSchema>;
export type CustomerAddress = z.infer<typeof customerAddressSchema>;
export type LinkedIdentities = z.infer<typeof identitiesResponseSchema>['data'];
export type CustomerOrder = z.infer<typeof customerOrderSchema>;
export type OrderTracking = z.infer<typeof orderTrackingSchema>;
export type ReorderResult = z.infer<typeof reorderResultSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;
export type ClubSnapshot = z.infer<typeof clubSnapshotSchema>;
export type SpinEligibility = z.infer<typeof spinEligibilitySchema>;
export type SpinPlay = z.infer<typeof spinPlaySchema>;
export type InboxNotification = z.infer<typeof notificationItemSchema>;
export type SupportConversation = z.infer<typeof supportConversationSchema>;
export type SupportMessage = z.infer<typeof supportMessageSchema>;
export type DiningTable = z.infer<typeof diningTableSchema>;
export type PublicDeal = z.infer<typeof publicDealSchema>;
export type StorefrontContent = z.infer<typeof storefrontContentSchema>;
export type CatalogAllergen = z.infer<typeof catalogAllergenSchema>;
export type CustomerBranch = Branch;
