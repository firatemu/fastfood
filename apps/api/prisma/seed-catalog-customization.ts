/**
 * HOME BURGER MENU — Modifier grupları + varyantlar + ingredient removal.
 *
 * Excel'den (Burger_Home_Menu.xlsx) çıkarılan gerçek menüye göre:
 *  - 100 gr / 130 gr / 200 gr / 65 gr gramaj seçenekleri → ProductVariant
 *  - Ekstra peynirler (Cheddar, Mozzarella, Hellim), ekstra malzemeler
 *    (Bacon, Soslu Mantar, Coleslaw, Kıtır Soğan, Kibrit Patates, Yumurta)
 *    ve soslar (Trüf, Crispy, Cheddar) → ModifierGroup + Modifier
 *  - Et burgerlerde 100 gr → 260 gr köfte upgrade
 *  - Tavuk burgerlerde 130 gr → 200 gr porsiyon upgrade
 *  - Tüm burgerlerde standart → büyük boy patates upgrade
 */
import type { PrismaClient } from './generated/client/client.js';

const PFX = '01900000-0000-7000-8000';

// ─── IDs ───
const IDS = {
  // Categories (must match seed.ts MENU_CATEGORIES)
  catEtBurgerler: '01900000-0000-7000-8000-b27a07d49ea2',
  catTavukBurgerler: '01900000-0000-7000-8000-107ce8177b3a',
  catCocukBurgerler: '01900000-0000-7000-8000-08e361dfc30b',
  catHotdog: '01900000-0000-7000-8000-0e6d244b6f5b',
  catAperatifler: '01900000-0000-7000-8000-d56f7e0d3dea',
  catSogukIcecekler: '01900000-0000-7000-8000-e768a8202c78',
  catKampanyaliMenuler: '01900000-0000-7000-8000-3acbb667b2c0',

  // Modifier groups
  gEtGramaj:        '01900000-0000-7000-8000-0e0100000001', // Et gramajı (100/260 gr dana)
  gTavukPorsiyon:   '01900000-0000-7000-8000-0e0100000002', // Tavuk porsiyonu (130/200 gr)
  gPatatesBoyut:    '01900000-0000-7000-8000-0e0100000003', // Patates boyutu
  gEkstraPeynir:    '01900000-0000-7000-8000-0e0100000004', // Ekstra peynir (3 seçenek)
  gEkstraMalzeme:   '01900000-0000-7000-8000-0e0100000005', // Ekstra malzeme (6 seçenek)
  gSoslar:          '01900000-0000-7000-8000-0e0100000006', // Soslar (3 seçenek)

  // Modifiers — Et gramajı
  mEt100:           '01900000-0000-7000-8000-0e0200000001',
  mEt260:           '01900000-0000-7000-8000-0e0200000002',
  // Tavuk porsiyonu
  mTavuk130:        '01900000-0000-7000-8000-0e0200000003',
  mTavuk200:        '01900000-0000-7000-8000-0e0200000004',
  // Patates boyutu
  mPatatesStd:      '01900000-0000-7000-8000-0e0200000005',
  mPatatesBuyuk:    '01900000-0000-7000-8000-0e0200000006',
  // Ekstra peynir
  mCheddar:         '01900000-0000-7000-8000-0e0200000007',
  mMozzarella:      '01900000-0000-7000-8000-0e0200000008',
  mHellim:          '01900000-0000-7000-8000-0e0200000009',
  // Ekstra malzeme
  mBacon:           '01900000-0000-7000-8000-0e020000000a',
  mSosluMantar:     '01900000-0000-7000-8000-0e020000000b',
  mColeslaw:        '01900000-0000-7000-8000-0e020000000c',
  mKitirSogan:      '01900000-0000-7000-8000-0e020000000d',
  mKibritPatates:   '01900000-0000-7000-8000-0e020000000e',
  mYumurta:         '01900000-0000-7000-8000-0e020000000f',
  // Soslar
  mTrufSos:         '01900000-0000-7000-8000-0e0200000010',
  mCrispySos:       '01900000-0000-7000-8000-0e0200000011',
  mCheddarSos:      '01900000-0000-7000-8000-0e0200000012',
};

// ─── Product slug → ID map (must match seed.ts homeMenuProductId()) ───
function homeMenuProductId(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  }
  const hex = (Math.abs(h) % 0xfffffffffff).toString(16).padStart(12, '0');
  return `${PFX}-${hex}`;
}

const SLUGS = {
  // Et burgerler
  classic:       homeMenuProductId('1-home-classic-burger'),
  cheese:        homeMenuProductId('2-home-cheese-burger'),
  bacon:         homeMenuProductId('3-home-bacon-burger'),
  mushroom:      homeMenuProductId('4-home-mushroom-burger'),
  fire:          homeMenuProductId('5-home-fire-burger'),
  threeShot:     homeMenuProductId('6-home-3-shot-burger'),
  diet:          homeMenuProductId('7-home-diet-burger'),
  lui:           homeMenuProductId('9-home-lui-burger'),
  peak:          homeMenuProductId('11-home-peak-burger'),
  warm:          homeMenuProductId('12-home-warm-burger'),
  craftBeef:     homeMenuProductId('home-craft-burger'),
  // Tavuk burgerler
  crispyChicken:    homeMenuProductId('13-home-crispy-chicken-burger'),
  truffleChicken:   homeMenuProductId('14-home-truffle-chicken-burger'),
  chicken:          homeMenuProductId('15-home-chicken-burger'),
  craftChicken:     homeMenuProductId('home-craft-chicken-burger'),
  // Çocuk burgerler
  kidsChicken:      homeMenuProductId('17-home-kids-chicken-burger'),
  kidsClassic:      homeMenuProductId('18-home-kids-classic-burger'),
  // Hotdog
  classicHotdog:    homeMenuProductId('1-home-classic-hotdog'),
  spicyHotdog:      homeMenuProductId('home-spicy-hotdog'),
  curryHotdog:      homeMenuProductId('home-curry-hotdog'),
  craftHotdog:      homeMenuProductId('home-craft-hotdog'),
};

const ALL_BEEF_BURGERS = [
  SLUGS.classic, SLUGS.cheese, SLUGS.bacon, SLUGS.mushroom,
  SLUGS.fire, SLUGS.threeShot, SLUGS.diet, SLUGS.lui,
  SLUGS.peak, SLUGS.warm, SLUGS.craftBeef,
] as const;

const ALL_CHICKEN_BURGERS = [
  SLUGS.crispyChicken, SLUGS.truffleChicken,
  SLUGS.chicken, SLUGS.craftChicken,
  SLUGS.kidsChicken, SLUGS.kidsClassic,
] as const;

const ALL_HOTDOGS = [
  SLUGS.classicHotdog, SLUGS.spicyHotdog, SLUGS.curryHotdog, SLUGS.craftHotdog,
] as const;

async function upsertModifierGroup(
  prisma: PrismaClient,
  id: string,
  name: string,
  selectionMin: number,
  selectionMax: number,
): Promise<void> {
  await prisma.modifierGroup.upsert({
    where: { id },
    create: { id, name, selectionMin, selectionMax, isActive: true },
    update: { name, selectionMin, selectionMax, isActive: true },
  });
}

async function upsertModifier(
  prisma: PrismaClient,
  id: string,
  groupId: string,
  name: string,
  priceDeltaMinor: bigint,
): Promise<void> {
  await prisma.modifier.upsert({
    where: { id },
    create: { id, modifierGroupId: groupId, name, priceDeltaMinor, isActive: true },
    update: { name, priceDeltaMinor, isActive: true },
  });
}

async function linkProductGroup(
  prisma: PrismaClient,
  productId: string,
  groupId: string,
  displayOrder: number,
): Promise<void> {
  await prisma.productModifierGroup.upsert({
    where: { productId_modifierGroupId: { productId, modifierGroupId: groupId } },
    create: { productId, modifierGroupId: groupId, displayOrder },
    update: { displayOrder },
  });
}

// ─── Variants ───
// 130 gr / 200 gr / 65 gr variantlar. 100 gr = Product.basePriceMinor.
const VARIANTS: ReadonlyArray<{
  id: string; productId: string; sku: string; name: string; priceMinor: bigint; displayOrder: number;
}> = [
  // Et burgerler → 130 gr variant
  { id: `${PFX}-0b0100000001`, productId: SLUGS.classic,    sku: 'HOME_CLASSIC_BURGER_130GR',     name: '130 gr', priceMinor: 46495n, displayOrder: 2 },
  { id: `${PFX}-0b0100000002`, productId: SLUGS.cheese,     sku: 'HOME_CHEESE_BURGER_130GR',      name: '130 gr', priceMinor: 47995n, displayOrder: 2 },
  { id: `${PFX}-0b0100000003`, productId: SLUGS.bacon,      sku: 'HOME_BACON_BURGER_130GR',       name: '130 gr', priceMinor: 49395n, displayOrder: 2 },
  { id: `${PFX}-0b0100000004`, productId: SLUGS.mushroom,   sku: 'HOME_MUSHROOM_BURGER_130GR',    name: '130 gr', priceMinor: 48395n, displayOrder: 2 },
  { id: `${PFX}-0b0100000005`, productId: SLUGS.fire,       sku: 'HOME_FIRE_BURGER_130GR',        name: '130 gr', priceMinor: 49295n, displayOrder: 2 },
  { id: `${PFX}-0b0100000006`, productId: SLUGS.diet,       sku: 'HOME_DIET_BURGER_130GR',        name: '130 gr', priceMinor: 49995n, displayOrder: 2 },
  { id: `${PFX}-0b0100000007`, productId: SLUGS.lui,        sku: 'HOME_LUI_BURGER_130GR',         name: '130 gr', priceMinor: 49795n, displayOrder: 2 },
  { id: `${PFX}-0b0100000008`, productId: SLUGS.peak,       sku: 'HOME_PEAK_BURGER_130GR',        name: '130 gr', priceMinor: 49295n, displayOrder: 2 },
  { id: `${PFX}-0b0100000009`, productId: SLUGS.warm,       sku: 'HOME_WARM_BURGER_130GR',        name: '130 gr', priceMinor: 49295n, displayOrder: 2 },
  { id: `${PFX}-0b010000000a`, productId: SLUGS.craftBeef,  sku: 'HOME_CRAFT_BURGER_130GR',       name: '130 gr', priceMinor: 49295n, displayOrder: 2 },
  // Tavuk burgerler → 200 gr variant
  { id: `${PFX}-0b010000000b`, productId: SLUGS.crispyChicken,  sku: 'HOME_CRISPY_CHICKEN_BURGER_200GR',  name: '200 gr', priceMinor: 47590n, displayOrder: 2 },
  { id: `${PFX}-0b010000000c`, productId: SLUGS.truffleChicken, sku: 'HOME_TRUFFLE_CHICKEN_BURGER_200GR', name: '200 gr', priceMinor: 48090n, displayOrder: 2 },
  { id: `${PFX}-0b010000000d`, productId: SLUGS.chicken,        sku: 'HOME_CHICKEN_BURGER_200GR',         name: '200 gr', priceMinor: 47190n, displayOrder: 2 },
];

// ─── Ingredient removal options ───
const BURGER_REMOVALS = [
  'Soğansız',
  'Turşusuz',
  'Domatesiz',
  'Marulsuz',
  'Sossuz',
  'Peynirsiz',
];

export async function seedCatalogCustomization(prisma: PrismaClient): Promise<void> {
  // 1) Modifier groups
  await upsertModifierGroup(prisma, IDS.gEtGramaj,      'Et Gramajı',        1, 1);
  await upsertModifierGroup(prisma, IDS.gTavukPorsiyon, 'Tavuk Porsiyonu',   1, 1);
  await upsertModifierGroup(prisma, IDS.gPatatesBoyut,  'Patates Boyutu',    1, 1);
  await upsertModifierGroup(prisma, IDS.gEkstraPeynir,  'Ekstra Peynir',     0, 3);
  await upsertModifierGroup(prisma, IDS.gEkstraMalzeme, 'Ekstra Malzeme',    0, 6);
  await upsertModifierGroup(prisma, IDS.gSoslar,        'Soslar',            0, 3);

  // 2) Modifiers
  await upsertModifier(prisma, IDS.mEt100,        IDS.gEtGramaj,      '100 gr Dana Eti (Standart)',  0n);
  await upsertModifier(prisma, IDS.mEt260,        IDS.gEtGramaj,      '260 gr Dana Eti',             12695n);

  await upsertModifier(prisma, IDS.mTavuk130,     IDS.gTavukPorsiyon, '130 gr (Standart)',           0n);
  await upsertModifier(prisma, IDS.mTavuk200,     IDS.gTavukPorsiyon, '200 gr (Büyük)',              4195n);

  await upsertModifier(prisma, IDS.mPatatesStd,   IDS.gPatatesBoyut,  'Standart',                    0n);
  await upsertModifier(prisma, IDS.mPatatesBuyuk, IDS.gPatatesBoyut,  'Büyük boy Patates',           2345n);

  await upsertModifier(prisma, IDS.mCheddar,      IDS.gEkstraPeynir,  'Cheddar Peynir',              1945n);
  await upsertModifier(prisma, IDS.mMozzarella,   IDS.gEkstraPeynir,  'Mozzarella Peynir',           1945n);
  await upsertModifier(prisma, IDS.mHellim,       IDS.gEkstraPeynir,  'Hellim Peynir',               1945n);

  await upsertModifier(prisma, IDS.mBacon,        IDS.gEkstraMalzeme, 'Bacon',                       3295n);
  await upsertModifier(prisma, IDS.mSosluMantar,  IDS.gEkstraMalzeme, 'Soslu Mantar',                2045n);
  await upsertModifier(prisma, IDS.mColeslaw,     IDS.gEkstraMalzeme, 'Coleslaw Salata',             2145n);
  await upsertModifier(prisma, IDS.mKitirSogan,   IDS.gEkstraMalzeme, 'Kıtır Soğan',                 1845n);
  await upsertModifier(prisma, IDS.mKibritPatates,IDS.gEkstraMalzeme, 'Kibrit Patates',              1695n);
  await upsertModifier(prisma, IDS.mYumurta,      IDS.gEkstraMalzeme, 'Yumurta',                     1645n);

  await upsertModifier(prisma, IDS.mTrufSos,      IDS.gSoslar,        'Trüf Sos',                    2295n);
  await upsertModifier(prisma, IDS.mCrispySos,    IDS.gSoslar,        'Crispy Sos',                  2045n);
  await upsertModifier(prisma, IDS.mCheddarSos,   IDS.gSoslar,        'Cheddar Sos',                 4995n);

  // 3) Product → Modifier group links
  // Et burgerler: gramaj (260 gr upgrade) + patates boyutu + ekstra peynir + ekstra malzeme + soslar
  for (const productId of ALL_BEEF_BURGERS) {
    await linkProductGroup(prisma, productId, IDS.gEtGramaj,      0);
    await linkProductGroup(prisma, productId, IDS.gPatatesBoyut,  1);
    await linkProductGroup(prisma, productId, IDS.gEkstraPeynir,  2);
    await linkProductGroup(prisma, productId, IDS.gEkstraMalzeme, 3);
    await linkProductGroup(prisma, productId, IDS.gSoslar,        4);
  }

  // Tavuk burgerler: tavuk porsiyonu (200 gr upgrade) + patates boyutu + ekstra peynir + ekstra malzeme + soslar
  for (const productId of ALL_CHICKEN_BURGERS) {
    await linkProductGroup(prisma, productId, IDS.gTavukPorsiyon, 0);
    await linkProductGroup(prisma, productId, IDS.gPatatesBoyut,  1);
    await linkProductGroup(prisma, productId, IDS.gEkstraPeynir,  2);
    await linkProductGroup(prisma, productId, IDS.gEkstraMalzeme, 3);
    await linkProductGroup(prisma, productId, IDS.gSoslar,        4);
  }

  // Hotdog: patates boyutu + ekstra peynir + ekstra malzeme + soslar (gramaj yok)
  for (const productId of ALL_HOTDOGS) {
    await linkProductGroup(prisma, productId, IDS.gPatatesBoyut,  0);
    await linkProductGroup(prisma, productId, IDS.gEkstraPeynir,  1);
    await linkProductGroup(prisma, productId, IDS.gEkstraMalzeme, 2);
    await linkProductGroup(prisma, productId, IDS.gSoslar,        3);
  }

  // 4) Variants
  for (const v of VARIANTS) {
    await prisma.productVariant.upsert({
      where: { id: v.id },
      create: {
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        name: v.name,
        priceMinor: v.priceMinor,
        displayOrder: v.displayOrder,
        isActive: true,
      },
      update: {
        name: v.name,
        priceMinor: v.priceMinor,
        displayOrder: v.displayOrder,
        isActive: true,
      },
    });
  }

  // 5) Ingredient removal options — tüm burgerler + hotdog
  let removalSeq = 1;
  for (const productId of [...ALL_BEEF_BURGERS, ...ALL_CHICKEN_BURGERS, ...ALL_HOTDOGS]) {
    for (const r of BURGER_REMOVALS) {
      const removalId = `${PFX}-0f01${removalSeq.toString(16).padStart(8, '0')}`;
      removalSeq += 1;
      await prisma.ingredientRemovalOption.upsert({
        where: { id: removalId },
        create: { id: removalId, productId, name: r, isActive: true },
        update: { name: r, isActive: true },
      });
    }
  }
}
