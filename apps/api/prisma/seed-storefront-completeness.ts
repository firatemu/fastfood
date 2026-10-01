/**
 * Storefront Phase 7 — public deals, branch story, legal/hikaye content, builder merch.
 * Local development persisted content (not JSX copy).
 */
import type { PrismaClient } from './generated/client/client.js';

const IDS = {
  downtown: '01900000-0000-7000-8000-faaaaaaaaaaa',
  besiktas: '01900000-0000-7000-8000-faaaaaaaaaab',
  builder: '01900000-0000-7000-8000-c1000000000d',
  welcomePromo: '01900000-0000-7000-c100-000000000010',
  loverPromo: '01900000-0000-7000-c200-000000000001',
  freeDelPromo: '01900000-0000-7000-c200-000000000002',
  hikaye: '01900000-0000-7000-c300-000000000001',
  kvkk: '01900000-0000-7000-c300-000000000002',
  terms: '01900000-0000-7000-c300-000000000003',
  privacy: '01900000-0000-7000-c300-000000000004',
  distance: '01900000-0000-7000-c300-000000000005',
  cancel: '01900000-0000-7000-c300-000000000006',
  cookies: '01900000-0000-7000-c300-000000000007',
  allergen: '01900000-0000-7000-c300-000000000008',
  company: '01900000-0000-7000-c300-000000000009',
} as const;

const EFFECTIVE = new Date('2026-01-01T00:00:00.000Z');

async function upsertContent(
  prisma: PrismaClient,
  input: {
    id: string;
    slug: string;
    kind: string;
    title: string;
    body: string;
    displayOrder: number;
    sections?: Array<{ id: string; heading: string; body: string }>;
  },
): Promise<void> {
  await prisma.storefrontContentDocument.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      slug: input.slug,
      kind: input.kind,
      title: input.title,
      body: input.body,
      sectionsJson: input.sections ?? [],
      effectiveAt: EFFECTIVE,
      isPublished: true,
      displayOrder: input.displayOrder,
    },
    update: {
      title: input.title,
      body: input.body,
      sectionsJson: input.sections ?? [],
      isPublished: true,
      displayOrder: input.displayOrder,
      effectiveAt: EFFECTIVE,
    },
  });
}

export async function seedStorefrontCompleteness(prisma: PrismaClient): Promise<void> {
  await prisma.productMerchandising.upsert({
    where: { productId: IDS.builder },
    create: {
      productId: IDS.builder,
      isBuilderBase: true,
      isFeatured: false,
      isHero: false,
      badge: 'ÖZEL',
      eyebrow: 'BURGER BUILDER',
      kcal: null,
    },
    update: { isBuilderBase: true, badge: 'ÖZEL', eyebrow: 'BURGER BUILDER' },
  });

  await prisma.branch.update({
    where: { id: IDS.downtown },
    data: {
      storyBody:
        'Kadıköy Moda’daki ilk BURGER HOME döküm ızgarası. Sabah fırından brioche, öğleden sonra taze çekilmiş dana döş. Teslimat ve gel-al açık.',
      pickupEnabled: true,
      deliveryEnabled: true,
    },
  });

  await prisma.branch.upsert({
    where: { id: IDS.besiktas },
    create: {
      id: IDS.besiktas,
      code: 'IST-BS',
      name: 'Beşiktaş',
      addressLine: 'Barbaros Bulvarı 8, Beşiktaş, İstanbul',
      latitude: 41.0422,
      longitude: 29.0083,
      phone: '+902121234568',
      isActive: true,
      isAcceptingOrders: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      minOrderMinor: 0n,
      deliveryFeeMinor: 0n,
      estimatedDeliveryMinutesMin: 0,
      estimatedDeliveryMinutesMax: 0,
      storyBody:
        'Beşiktaş şubesi yalnızca gel-al. Teslimat bu şubeden kapalıdır; siparişini mağazada teslim alabilirsin.',
    },
    update: {
      name: 'Beşiktaş',
      isActive: true,
      isAcceptingOrders: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      storyBody:
        'Beşiktaş şubesi yalnızca gel-al. Teslimat bu şubeden kapalıdır; siparişini mağazada teslim alabilirsin.',
    },
  });

  const hours = [
    { dayOfWeek: 1, opensAt: '11:30', closesAt: '23:00' },
    { dayOfWeek: 2, opensAt: '11:30', closesAt: '23:00' },
    { dayOfWeek: 3, opensAt: '11:30', closesAt: '23:00' },
    { dayOfWeek: 4, opensAt: '11:30', closesAt: '23:00' },
    { dayOfWeek: 5, opensAt: '11:30', closesAt: '00:00' },
    { dayOfWeek: 6, opensAt: '12:00', closesAt: '00:00' },
    { dayOfWeek: 0, opensAt: '12:00', closesAt: '22:00' },
  ];
  for (const h of hours) {
    const opens = new Date(`1970-01-01T${h.opensAt}:00.000Z`);
    const closes = new Date(`1970-01-01T${h.closesAt}:00.000Z`);
    await prisma.branchOperatingHours.upsert({
      where: { branchId_dayOfWeek: { branchId: IDS.besiktas, dayOfWeek: h.dayOfWeek } },
      create: {
        branchId: IDS.besiktas,
        dayOfWeek: h.dayOfWeek,
        opensAt: opens,
        closesAt: closes,
        isClosed: false,
      },
      update: { opensAt: opens, closesAt: closes, isClosed: false },
    });
  }

  await prisma.promotion.update({
    where: { id: IDS.welcomePromo },
    data: {
      listedOnStorefront: true,
      customerHeadline: 'BURGER HOME CLUB hoş geldin indirimi',
      customerDescription: 'İlk siparişte sepete otomatik uygulanır. İkinci bir cüzdan değildir.',
    },
  });

  await prisma.promotion.upsert({
    where: { id: IDS.loverPromo },
    create: {
      id: IDS.loverPromo,
      code: 'BURGERLOVER',
      name: 'BURGERLOVER',
      kind: 'PERCENT_CART',
      discountPercentBps: 1000,
      minMerchandiseMinor: 0n,
      listedOnStorefront: true,
      customerHeadline: '%10 sepet indirimi',
      customerDescription: 'Checkout’ta BURGERLOVER kodunu kullan. Asıl tutar quote motorundadır.',
      isActive: true,
    },
    update: {
      listedOnStorefront: true,
      customerHeadline: '%10 sepet indirimi',
      customerDescription: 'Checkout’ta BURGERLOVER kodunu kullan. Asıl tutar quote motorundadır.',
      isActive: true,
      discountPercentBps: 1000,
    },
  });

  await prisma.promotion.upsert({
    where: { id: IDS.freeDelPromo },
    create: {
      id: IDS.freeDelPromo,
      code: 'ATESKARGO',
      name: 'Ateş kargo',
      kind: 'DELIVERY_FEE_WAIVER',
      listedOnStorefront: true,
      customerHeadline: 'Teslimat ücreti yok',
      customerDescription: 'Uygun teslimat siparişlerinde kargo satırını sıfırlar.',
      isActive: true,
    },
    update: {
      listedOnStorefront: true,
      customerHeadline: 'Teslimat ücreti yok',
      isActive: true,
    },
  });

  await upsertContent(prisma, {
    id: IDS.hikaye,
    slug: 'hikaye',
    kind: 'STORY',
    title: 'BURGER HOME hikâyesi',
    body: 'Yüksek ısı, kısa temas, taze dana. BURGER HOME döküm ızgarada smash tekniğiyle çalışır.',
    displayOrder: 0,
    sections: [
      {
        id: 'sourcing',
        heading: 'Et ve ekmek',
        body: 'Dana döş günlük çekilir. Brioche her sabah fırından gelir. Bu metin CMS kaydıdır; sayfa JSX’ine gömülü değildir.',
      },
      {
        id: 'values',
        heading: 'Değerler',
        body: 'Şeffaf alerjen bilgisi, sunucu fiyatı, sahte sadakat puanı yok. Lezzet iddiası tıbbi iddia değildir.',
      },
    ],
  });

  await upsertContent(prisma, {
    id: IDS.kvkk,
    slug: 'kvkk',
    kind: 'LEGAL',
    title: 'KVKK aydınlatma',
    body: 'BURGER HOME, sipariş, teslimat ve hesap işlemleri için gerekli kişisel verileri işler. Bu metin geliştirme ortamı kaydıdır; sicil numarası yapılandırılmamıştır.',
    displayOrder: 1,
  });

  await upsertContent(prisma, {
    id: IDS.privacy,
    slug: 'gizlilik-sozlesmesi',
    kind: 'LEGAL',
    title: 'Gizlilik',
    body: 'Oturum çerezleri, sepet oturumu ve isteğe bağlı Ember bülteni dışında üçüncü taraf pazarlama pikseli bu Storefront’ta zorunlu değildir.',
    displayOrder: 2,
  });

  await upsertContent(prisma, {
    id: IDS.terms,
    slug: 'kullanim-kosullari',
    kind: 'LEGAL',
    title: 'Kullanım koşulları',
    body: 'Menü, fiyat ve teslimat uygunluğu sipariş anındaki sunucu quote’una tabidir. Stitch prototip metinleri sözleşme değildir.',
    displayOrder: 3,
  });

  await upsertContent(prisma, {
    id: IDS.distance,
    slug: 'mesafeli-satis',
    kind: 'LEGAL',
    title: 'Mesafeli satış bilgisi',
    body: 'Hazır gıda siparişleri mesafeli satış kapsamındaki cayma istisnalarına tabi olabilir. Kesin hukuki metin operasyonel onay sonrası güncellenir.',
    displayOrder: 4,
  });

  await upsertContent(prisma, {
    id: IDS.cancel,
    slug: 'iptal-iade',
    kind: 'LEGAL',
    title: 'İptal ve iade',
    body: 'Hazırlık başladıktan sonra iptal mutfak durumuna bağlıdır. Ücret iadesi mevcut iade/ödeme akışlarıyla işlenir; bu sayfa fiyatlandırma yetkisi değildir.',
    displayOrder: 5,
  });

  await upsertContent(prisma, {
    id: IDS.cookies,
    slug: 'cerezler',
    kind: 'LEGAL',
    title: 'Çerezler',
    body: 'Zorunlu oturum (sepet, teslimat konumu, kimlik yenileme) kullanılır. Pazarlama çerezi yoksa onay bandı gösterilmez.',
    displayOrder: 6,
  });

  await upsertContent(prisma, {
    id: IDS.allergen,
    slug: 'alerjen-rehberi',
    kind: 'ALLERGEN_DISCLAIMER',
    title: 'Alerjen rehberi',
    body: 'Alerjen listesi katalog sözlüğünden gelir. Çapraz bulaşma mutfakta mümkündür. Tıbbi tavsiye veya alerji garantisi değildir.',
    displayOrder: 7,
  });

  await upsertContent(prisma, {
    id: IDS.company,
    slug: 'sirket',
    kind: 'COMPANY',
    title: 'İletişim',
    body: 'Ticari unvan bu geliştirme ortamında BURGER HOME olarak geçer. MERSIS ve vergi kimlik numarası yapılandırılmamıştır; uydurulmaz.',
    displayOrder: 8,
    sections: [
      {
        id: 'contact',
        heading: 'Şube iletişim',
        body: 'Kadıköy Moda, Moda Caddesi 12. Telefon şube kaydındaki numaradır.',
      },
    ],
  });
}
