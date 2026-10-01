/**
 * Golden Home merchandising: nutrition, featured flags, combo, reviews.
 * Demo catalog data lives here so the Storefront UI never hard-codes SKUs.
 */
import type { PrismaClient } from './generated/client/client.js';

const IDS = {
  burgers: '01900000-0000-7000-8000-aaaaaaaaaaaa',
  sides: '01900000-0000-7000-8000-bbbbbbbbbbbb',
  drinks: '01900000-0000-7000-8000-cccc00000001',
  chicken: '01900000-0000-7000-8000-cccc00000002',
  downtown: '01900000-0000-7000-8000-faaaaaaaaaaa',
  productSmash: '01900000-0000-7000-8000-c10000000002',
  productBbq: '01900000-0000-7000-8000-c10000000003',
  productTruffle: '01900000-0000-7000-8000-c10000000005',
  productChicken: '01900000-0000-7000-8000-c10000000006',
  productFries: '01900000-0000-7000-8000-c10000000008',
  productShake: '01900000-0000-7000-8000-c1000000000c',
  mediaShake: '01900000-0000-7000-8000-0d010000000c',
  availShake: '01900000-0000-7000-8000-0a010000000c',
  combo: '01900000-0000-7000-8000-c0b000000001',
  comboItemSmash: '01900000-0000-7000-8000-c0b000000011',
  comboItemFries: '01900000-0000-7000-8000-c0b000000012',
  comboItemShake: '01900000-0000-7000-8000-c0b000000013',
  review1: '01900000-0000-7000-8000-0e0000000001',
  review2: '01900000-0000-7000-8000-0e0000000002',
  review3: '01900000-0000-7000-8000-0e0000000003',
  socialProof: '01900000-0000-7000-8000-50c1a1000001',
} as const;

type MerchSeed = {
  productId: string;
  isFeatured: boolean;
  isHero: boolean;
  displayOrder: number;
  kcal?: number;
  proteinGrams?: number;
  weightGrams?: number;
  volumeMl?: number;
  spiceLevel?: number;
  badge?: string;
  accentLabel?: string;
  eyebrow?: string;
  heroDescription?: string;
  heroImageUrl?: string;
  soldCount: number;
  averageRatingBps: number;
  ratingCount: number;
  name: string;
  description: string;
  basePriceMinor: bigint;
  categoryId: string;
  heroSpecJson?: { items: Array<{ key: string; label: string; value: string; hint: string }> };
};

const MERCH: MerchSeed[] = [
  {
    productId: IDS.productTruffle,
    isFeatured: true,
    isHero: true,
    displayOrder: 3,
    kcal: 810,
    proteinGrams: 48,
    weightGrams: 180,
    badge: 'Gurme Seri',
    accentLabel: 'Trüf Aromalı',
    eyebrow: 'GURME ATEŞ MÜHENDİSLİĞİ',
    heroDescription:
      '28 gün kuru dinlendirilmiş %100 yerli dana döş, 280°C saf döküm ızgarada milimetrik karamelize edilmiş dantel kenarlar, siyah trüf mayonezi ve eritilmiş 14 aylık gouda.',
    heroImageUrl: '/storefront/assets/home/hero-truffle.jpg',
    soldCount: 3400,
    averageRatingBps: 500,
    ratingCount: 2100,
    name: 'THE DOUBLE TRUFFLE SMASH',
    description:
      'Kuru dinlendirilmiş çift smash köfte, 14 aylık yaşlandırılmış gouda, tereyağlı sote kestane mantarı, siyah trüf mayonezi.',
    basePriceMinor: 39500n,
    categoryId: IDS.burgers,
    heroSpecJson: {
      items: [
        { key: 'eti', label: 'Eti', value: '2 x 100g', hint: 'Kuru Dinlendirilmiş' },
        { key: 'ekmek', label: 'Ekmek', value: 'Brioche', hint: 'Taze Patatesli Hamur' },
        { key: 'doku', label: 'Doku', value: '%100 Çıtır', hint: 'Lacy Edge Smashed' },
      ],
    },
  },
  {
    productId: IDS.productSmash,
    isFeatured: true,
    isHero: false,
    displayOrder: 1,
    kcal: 720,
    proteinGrams: 42,
    weightGrams: 180,
    spiceLevel: 1,
    badge: 'İmza Burger',
    accentLabel: 'Hafif Acı',
    soldCount: 1400,
    averageRatingBps: 490,
    ratingCount: 1400,
    name: 'Classic Double Smash',
    description:
      'Çift kat 90g smash köfte, eritilmiş double cheddar, ev yapımı salatalık turşusu, taze kıyılmış soğan ve Smash Gizli Sos.',
    basePriceMinor: 31000n,
    categoryId: IDS.burgers,
  },
  {
    productId: IDS.productBbq,
    isFeatured: true,
    isHero: false,
    displayOrder: 2,
    kcal: 880,
    proteinGrams: 46,
    spiceLevel: 1,
    badge: 'Şefin Tercihi',
    accentLabel: 'Tütsülü Lezzet',
    soldCount: 890,
    averageRatingBps: 480,
    ratingCount: 890,
    name: 'Smokehouse Bacon BBQ',
    description:
      'Çift smash köfte, meşe talaşında tütsülenmiş dana bacon, çıtır soğan samanı, füme provolone peyniri ve özel viskili BBQ sos.',
    basePriceMinor: 36500n,
    categoryId: IDS.burgers,
  },
  {
    productId: IDS.productChicken,
    isFeatured: true,
    isHero: false,
    displayOrder: 4,
    kcal: 690,
    proteinGrams: 38,
    spiceLevel: 2,
    badge: 'Aşırı Çıtır',
    accentLabel: '2x Acı Derecesi',
    soldCount: 950,
    averageRatingBps: 480,
    ratingCount: 950,
    name: 'Spicy Jalapeño Crispy',
    description:
      'Buttermilk marineli çıtır tavuk kalça, acı bal glaze sosu, taze jalapeño dilimleri, mor lahana coleslaw ve chipotle aioli.',
    basePriceMinor: 29000n,
    categoryId: IDS.chicken,
  },
  {
    productId: IDS.productFries,
    isFeatured: true,
    isHero: false,
    displayOrder: 5,
    kcal: 420,
    badge: 'Yan Lezzet',
    accentLabel: 'Paylaşımlık',
    soldCount: 1100,
    averageRatingBps: 490,
    ratingCount: 1100,
    name: 'Loaded Truffle & Parm Fries',
    description:
      'Kabuklu taze patates kızartması, beyaz trüf yağı, rendelenmiş 24 aylık parmesan, taze biberiye ve sarımsaklı çıtır kruton kırıntıları.',
    basePriceMinor: 16500n,
    categoryId: IDS.sides,
  },
  {
    productId: IDS.productShake,
    isFeatured: true,
    isHero: false,
    displayOrder: 6,
    volumeMl: 380,
    badge: 'Tatlı & Soğuk',
    accentLabel: 'Doğal Süt',
    soldCount: 780,
    averageRatingBps: 490,
    ratingCount: 780,
    name: 'Salted Caramel Shake',
    description:
      'Gerçek Madagaskar vanilyalı dondurma bazı, ev yapımı deniz tuzlu tereyağlı karamel sosu ve kavrulmuş ceviz parçacıkları.',
    basePriceMinor: 14000n,
    categoryId: IDS.drinks,
  },
];

export async function seedStorefrontHome(prisma: PrismaClient): Promise<void> {
  await prisma.category.upsert({
    where: { id: IDS.burgers },
    create: {
      id: IDS.burgers,
      slug: 'burgers',
      name: 'Smash Burgerler',
      description: 'Döküm ızgara smash burgerler',
      displayOrder: 1,
      isActive: true,
    },
    update: { name: 'Smash Burgerler', isActive: true },
  });
  await prisma.category.upsert({
    where: { id: IDS.chicken },
    create: {
      id: IDS.chicken,
      slug: 'chicken',
      name: 'Tavuk & Crispy',
      description: 'Crispy chicken burgers',
      displayOrder: 2,
      isActive: true,
    },
    update: { name: 'Tavuk & Crispy', isActive: true },
  });
  await prisma.category.upsert({
    where: { id: IDS.sides },
    create: {
      id: IDS.sides,
      slug: 'sides',
      name: 'Özel Yanlar & Fries',
      description: 'Fries and sides',
      displayOrder: 3,
      isActive: true,
    },
    update: { name: 'Özel Yanlar & Fries', isActive: true },
  });
  await prisma.category.upsert({
    where: { id: IDS.drinks },
    create: {
      id: IDS.drinks,
      slug: 'drinks',
      name: 'Artisan Shake & İçecek',
      description: 'Shakes and drinks',
      displayOrder: 4,
      isActive: true,
    },
    update: { name: 'Artisan Shake & İçecek', isActive: true },
  });

  await prisma.product.upsert({
    where: { id: IDS.productShake },
    create: {
      id: IDS.productShake,
      categoryId: IDS.drinks,
      slug: 'salted-caramel-shake',
      name: 'Salted Caramel Shake',
      description: 'House vanilla shake with salted caramel',
      basePriceMinor: 14000n,
      currency: 'TRY',
      displayOrder: 3,
      isActive: true,
    },
    update: {
      categoryId: IDS.drinks,
      name: 'Salted Caramel Shake',
      description: 'House vanilla shake with salted caramel',
      basePriceMinor: 14000n,
      isActive: true,
    },
  });
  await prisma.productMedia.upsert({
    where: { id: IDS.mediaShake },
    create: {
      id: IDS.mediaShake,
      productId: IDS.productShake,
      url: '/storefront/assets/home/product-shake.jpg',
      altText: 'Salted Caramel Shake',
      displayOrder: 0,
    },
    update: { url: '/storefront/assets/home/product-shake.jpg', altText: 'Salted Caramel Shake' },
  });
  await prisma.branchProductAvailability.upsert({
    where: { branchId_productId: { branchId: IDS.downtown, productId: IDS.productShake } },
    create: {
      id: IDS.availShake,
      branchId: IDS.downtown,
      productId: IDS.productShake,
      isAvailable: true,
    },
    update: { isAvailable: true },
  });

  const assetByProduct: Record<string, string> = {
    [IDS.productSmash]: '/storefront/assets/home/product-classic-smash.jpg',
    [IDS.productBbq]: '/storefront/assets/home/product-bbq.jpg',
    [IDS.productTruffle]: '/storefront/assets/home/product-truffle.jpg',
    [IDS.productChicken]: '/storefront/assets/home/product-chicken.jpg',
    [IDS.productFries]: '/storefront/assets/home/product-fries.jpg',
    [IDS.productShake]: '/storefront/assets/home/product-shake.jpg',
  };

  for (const item of MERCH) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        name: item.name,
        description: item.description,
        basePriceMinor: item.basePriceMinor,
        categoryId: item.categoryId,
        displayOrder: item.displayOrder,
        isActive: true,
      },
    });
    await prisma.productMerchandising.upsert({
      where: { productId: item.productId },
      create: {
        productId: item.productId,
        isFeatured: item.isFeatured,
        isHero: item.isHero,
        kcal: item.kcal ?? null,
        proteinGrams: item.proteinGrams ?? null,
        weightGrams: item.weightGrams ?? null,
        volumeMl: item.volumeMl ?? null,
        spiceLevel: item.spiceLevel ?? null,
        badge: item.badge ?? null,
        accentLabel: item.accentLabel ?? null,
        eyebrow: item.eyebrow ?? null,
        heroDescription: item.heroDescription ?? null,
        heroImageUrl: item.heroImageUrl ?? null,
        soldCount: item.soldCount,
        averageRatingBps: item.averageRatingBps,
        ratingCount: item.ratingCount,
        heroSpecJson: item.heroSpecJson ?? undefined,
      },
      update: {
        isFeatured: item.isFeatured,
        isHero: item.isHero,
        kcal: item.kcal ?? null,
        proteinGrams: item.proteinGrams ?? null,
        weightGrams: item.weightGrams ?? null,
        volumeMl: item.volumeMl ?? null,
        spiceLevel: item.spiceLevel ?? null,
        badge: item.badge ?? null,
        accentLabel: item.accentLabel ?? null,
        eyebrow: item.eyebrow ?? null,
        heroDescription: item.heroDescription ?? null,
        heroImageUrl: item.heroImageUrl ?? null,
        soldCount: item.soldCount,
        averageRatingBps: item.averageRatingBps,
        ratingCount: item.ratingCount,
        heroSpecJson: item.heroSpecJson ?? undefined,
      },
    });
    const url = assetByProduct[item.productId];
    if (url) {
      await prisma.productMedia.updateMany({
        where: { productId: item.productId },
        data: { url, altText: item.name },
      });
    }
  }

  const endsAt = new Date(Date.now() + (4 * 3600 + 32 * 60 + 18) * 1000);
  await prisma.storefrontComboOffer.upsert({
    where: { id: IDS.combo },
    create: {
      id: IDS.combo,
      slug: 'pitmaster-combo',
      name: 'THE PITMASTER COMBO: BURGER + FRIES + SHAKE',
      description:
        'Classic Double Smash Burger, Baharatlı Çıtır Patates, Ev Yapımı Trüflü Mayonez ve seçeceğiniz Artisan Milkshake ile tek pakette eksiksiz gurme deneyimi.',
      imageUrl: '/storefront/assets/home/combo-pitmaster.jpg',
      bundlePriceMinor: 48500n,
      compareAtMinor: 61500n,
      currency: 'TRY',
      endsAt,
      isActive: true,
      displayOrder: 1,
    },
    update: {
      name: 'THE PITMASTER COMBO: BURGER + FRIES + SHAKE',
      description:
        'Classic Double Smash Burger, Baharatlı Çıtır Patates, Ev Yapımı Trüflü Mayonez ve seçeceğiniz Artisan Milkshake ile tek pakette eksiksiz gurme deneyimi.',
      imageUrl: '/storefront/assets/home/combo-pitmaster.jpg',
      bundlePriceMinor: 48500n,
      compareAtMinor: 61500n,
      endsAt,
      isActive: true,
    },
  });

  const comboItems = [
    { id: IDS.comboItemSmash, productId: IDS.productSmash, quantity: 1, displayOrder: 1 },
    { id: IDS.comboItemFries, productId: IDS.productFries, quantity: 1, displayOrder: 2 },
    { id: IDS.comboItemShake, productId: IDS.productShake, quantity: 1, displayOrder: 3 },
  ];
  for (const item of comboItems) {
    await prisma.storefrontComboOfferItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        comboOfferId: IDS.combo,
        productId: item.productId,
        quantity: item.quantity,
        displayOrder: item.displayOrder,
      },
      update: { quantity: item.quantity, displayOrder: item.displayOrder },
    });
  }

  const now = Date.now();
  const reviews = [
    {
      id: IDS.review1,
      authorDisplayName: 'Emre K.',
      body: "Kadıköy'deki en iyi smash burger. Köftenin kenarlarındaki o çıtırlık Maillard reaksiyonunun zirvesi. Trüflü patatesleri ise bağımlılık yapıyor.",
      rating: 5,
      branchLabel: 'Moda Şubesi Siparişi',
      publishedAt: new Date(now - 24 * 3600 * 1000),
      displayOrder: 1,
    },
    {
      id: IDS.review2,
      authorDisplayName: 'Selin Y.',
      body: 'Sıcak teslimat sözünü gerçekten tutuyorlar. Termal pakette geldi, ekmek terlememiş, köftenin suyu içinde kalmıştı. Tebrikler BURGER HOME.',
      rating: 5,
      branchLabel: 'Caddebostan Siparişi',
      publishedAt: new Date(now - 3 * 24 * 3600 * 1000),
      displayOrder: 2,
    },
    {
      id: IDS.review3,
      authorDisplayName: 'Burak T.',
      body: 'Spicy Crispy Chicken tek kelimeyle başyapıt. Acı sosuyla lahana salatasının dengesi tam ayarında. Milkshake ise ultra yoğun kıvamda.',
      rating: 5,
      branchLabel: 'Beşiktaş Şubesi Siparişi',
      publishedAt: new Date(now - 7 * 24 * 3600 * 1000),
      displayOrder: 3,
    },
  ];
  for (const review of reviews) {
    await prisma.storefrontPublishedReview.upsert({
      where: { id: review.id },
      create: { ...review, isPublished: true },
      update: {
        authorDisplayName: review.authorDisplayName,
        body: review.body,
        rating: review.rating,
        branchLabel: review.branchLabel,
        publishedAt: review.publishedAt,
        isPublished: true,
        displayOrder: review.displayOrder,
      },
    });
  }

  await prisma.storefrontSocialProof.upsert({
    where: { id: IDS.socialProof },
    create: {
      id: IDS.socialProof,
      averageRatingBps: 490,
      happyCustomerCount: 12000,
    },
    update: {
      averageRatingBps: 490,
      happyCustomerCount: 12000,
    },
  });

  await prisma.category.updateMany({
    where: { name: { in: ['Human Test', 'Persist Burgers'] } },
    data: { isActive: false },
  });

  await prisma.branch.update({
    where: { id: IDS.downtown },
    data: {
      name: 'Kadıköy Moda',
      addressLine: 'Moda Caddesi 12, Kadıköy, İstanbul',
      estimatedDeliveryMinutesMin: 25,
      estimatedDeliveryMinutesMax: 35,
      isAcceptingOrders: true,
    },
  });
}
