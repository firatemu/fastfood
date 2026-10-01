/**
 * Deterministic development seed.
 *
 * Upserts demo catalog, downtown branch + service area, staff user
 * (password hash only — never log plaintext), courier profile, and
 * role/permission links.
 *
 * Document 35 §13.
 */
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';

import { PrismaPg } from '@prisma/adapter-pg';
import { CANONICAL_ADMIN_PAGE_PERMISSION_CODES } from '@fastfood/domain-types';

import { PrismaClient } from './generated/client/client.js';
import { seedCatalogCustomization } from './seed-catalog-customization.js';
import { seedClubEngagement } from './seed-club-engagement.js';
import { seedStorefrontCompleteness } from './seed-storefront-completeness.js';
import { seedStorefrontHome } from './seed-storefront-home.js';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number },
) => Promise<Buffer>;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for the seed script.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const CANONICAL_PERMISSIONS: ReadonlyArray<{ code: string; description: string }> = [
  { code: 'catalog.products.read', description: 'Read products' },
  { code: 'catalog.products.write', description: 'Create / update products' },
  { code: 'catalog.prices.write', description: 'Update prices' },
  { code: 'catalog.media.write', description: 'Upload / manage media' },
  { code: 'branches.read', description: 'Read branches' },
  { code: 'branches.write', description: 'Create / update branches' },
  { code: 'branches.service_areas.write', description: 'Edit service areas' },
  { code: 'orders.read', description: 'Read orders' },
  { code: 'orders.update_status', description: 'Update order status' },
  { code: 'orders.reassign_branch', description: 'Reassign orders between branches' },
  { code: 'payments.read', description: 'Read payments' },
  { code: 'payments.refund', description: 'Issue refunds' },
  { code: 'loyalty.read', description: 'Read loyalty state' },
  { code: 'loyalty.settings.write', description: 'Edit loyalty configuration' },
  { code: 'reports.read', description: 'Read reports' },
  { code: 'couriers.read', description: 'Read couriers' },
  { code: 'couriers.assign', description: 'Assign deliveries to couriers' },
  { code: 'couriers.write', description: 'Manage courier accounts' },
  { code: 'audit.read', description: 'Read audit log' },
  { code: 'users.read', description: 'Read users' },
  { code: 'users.write', description: 'Manage users' },
  { code: 'users.branch_admin.assign', description: 'Assign or transfer branch administrators' },
  { code: 'settings.read', description: 'Read business settings' },
  { code: 'settings.write', description: 'Edit business settings' },
  ...CANONICAL_ADMIN_PAGE_PERMISSION_CODES.map((code) => ({
    code,
    description: `${code.split('.').at(-1)} access for ${code.split('.').slice(2, -1).join(' ')} page`,
  })),
];

const IDS = {
  foundation: '01900000-0000-7000-8000-000000000001',
  burgers: '01900000-0000-7000-8000-aaaaaaaaaaaa',
  sides: '01900000-0000-7000-8000-bbbbbbbbbbbb',
  cheeseburger: '01900000-0000-7000-8000-cccccccccccc',
  gluten: '01900000-0000-7000-8000-dddddddddddd',
  dairy: '01900000-0000-7000-8000-eeeeeeeeeeee',
  downtown: '01900000-0000-7000-8000-faaaaaaaaaaa',
  serviceArea: '01900000-0000-7000-8000-fbbbbbbbbbbb',
  staffUser: '01900000-0000-7000-8000-00000000a001',
  courierUser: '01900000-0000-7000-8000-00000000a002',
  courierProfile: '01900000-0000-7000-8000-00000000a003',
  branchStaffUser: '01900000-0000-7000-8000-00000000a004',
  hqRole: '01900000-0000-7000-8000-00000000b001',
  courierRole: '01900000-0000-7000-8000-00000000b002',
  branchAdminRole: '01900000-0000-7000-8000-00000000b003',
  branchUserRole: '01900000-0000-7000-8000-00000000b004',
  drinks: '01900000-0000-7000-8000-cccc00000001',
  productSmash: '01900000-0000-7000-8000-c10000000002',
  productBbq: '01900000-0000-7000-8000-c10000000003',
  productVeggie: '01900000-0000-7000-8000-c10000000004',
  productTruffle: '01900000-0000-7000-8000-c10000000005',
  productChicken: '01900000-0000-7000-8000-c10000000006',
  productSpicy: '01900000-0000-7000-8000-c10000000007',
  productFries: '01900000-0000-7000-8000-c10000000008',
  productOnionRings: '01900000-0000-7000-8000-c10000000009',
  productCola: '01900000-0000-7000-8000-c1000000000a',
  productLemonade: '01900000-0000-7000-8000-c1000000000b',
  mediaCheese: '01900000-0000-7000-8000-0d0100000001',
  mediaSmash: '01900000-0000-7000-8000-0d0100000002',
  mediaBbq: '01900000-0000-7000-8000-0d0100000003',
  mediaVeggie: '01900000-0000-7000-8000-0d0100000004',
  mediaTruffle: '01900000-0000-7000-8000-0d0100000005',
  mediaChicken: '01900000-0000-7000-8000-0d0100000006',
  mediaSpicy: '01900000-0000-7000-8000-0d0100000007',
  mediaFries: '01900000-0000-7000-8000-0d0100000008',
  mediaOnion: '01900000-0000-7000-8000-0d0100000009',
  mediaCola: '01900000-0000-7000-8000-0d010000000a',
  mediaLemonade: '01900000-0000-7000-8000-0d010000000b',
  availCheese: '01900000-0000-7000-8000-0a0100000001',
  availSmash: '01900000-0000-7000-8000-0a0100000002',
  availBbq: '01900000-0000-7000-8000-0a0100000003',
  availVeggie: '01900000-0000-7000-8000-0a0100000004',
  availTruffle: '01900000-0000-7000-8000-0a0100000005',
  availChicken: '01900000-0000-7000-8000-0a0100000006',
  availSpicy: '01900000-0000-7000-8000-0a0100000007',
  availFries: '01900000-0000-7000-8000-0a0100000008',
  availOnion: '01900000-0000-7000-8000-0a0100000009',
  availCola: '01900000-0000-7000-8000-0a010000000a',
  availLemonade: '01900000-0000-7000-8000-0a010000000b',
} as const;

const STOREFRONT_PRODUCT_MEDIA = '/storefront/media/products';

type SeedCatalogProduct = {
  id: string;
  availabilityId: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  basePriceMinor: bigint;
  displayOrder: number;
  allergenIds: string[];
};

// ─── HOME BURGER MENU (from Burger_Home_Menu.xlsx) ───
const MENU_CATEGORIES: ReadonlyArray<{
  id: string;
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
}> = [
  { id: '01900000-0000-7000-8000-00000e359a1a', slug: 'et-burgerler', name: 'ET BURGERLER', description: '100% dana burgerler, özel soslar, özel ekmek', displayOrder: 1 },
  { id: '01900000-0000-7000-8000-00006db4fd36', slug: 'tavuk-burgerler', name: 'TAVUK BURGERLER', description: 'Çıtır tavuk fileto burgerler', displayOrder: 2 },
  { id: '01900000-0000-7000-8000-00001c8a7a04', slug: 'cocuk-burgerler', name: 'ÇOCUK BURGERLER', description: 'Çocuklar için 65 gr burgerler', displayOrder: 3 },
  { id: '01900000-0000-7000-8000-000048358e31', slug: 'hotdog', name: 'HOTDOG', description: 'Dana sosis, özel soslar, sandviç ekmeği', displayOrder: 4 },
  { id: '01900000-0000-7000-8000-00001ccac113', slug: 'aperatifler', name: 'APERATİFLER', description: 'Patates, nugget, mozzarella, soğan halkası ve daha fazlası', displayOrder: 5 },
  { id: '01900000-0000-7000-8000-00007dcf860f', slug: 'soguk-icecekler', name: 'SOĞUK İÇECEKLER', description: 'Meşrubat, soda, ayran, su', displayOrder: 6 },
  { id: '01900000-0000-7000-8000-000072529488', slug: 'kampanyali-menuler', name: 'KAMPANYALI MENÜLER', description: 'Menü + patates + içecek bir arada, avantajlı', displayOrder: 7 },
];

function homeMenuProductId(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  }
  const hex = (Math.abs(h) % 0xfffffffffff).toString(16).padStart(12, '0');
  return `01900000-0000-7000-8000-${hex}`;
}
function homeMenuMediaId(slug: string): string {
  return `01900000-0000-7000-8000-0d${homeMenuProductId(slug).slice(21)}`;
}
function homeMenuAvailabilityId(slug: string): string {
  return `01900000-0000-7000-8000-0a${homeMenuProductId(slug).slice(21)}`;
}

const DEMO_CATALOG_PRODUCTS: SeedCatalogProduct[] = [
  {
    id: '01900000-0000-7000-8000-00007bc6fede',
    availabilityId: '01900000-0000-7000-8000-00001b505ac9',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '1-home-classic-burger',
    name: '1- HOME CLASSIC BURGER',
    description: '100% dana eti , akdeniz yeşillikleri , domates , turşu , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 42995n,
    displayOrder: 1,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-0000791be338',
    availabilityId: '01900000-0000-7000-8000-00004c6f38b1',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '2-home-cheese-burger',
    name: '2- HOME CHEESE BURGER',
    description: '100% dana eti , çift cheddar peyniri , akdeniz yeşillikleri , domates , turşu , karamelize soğan , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 44495n,
    displayOrder: 2,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000021a333b3',
    availabilityId: '01900000-0000-7000-8000-00006242cb1a',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '3-home-bacon-burger',
    name: '3- HOME BACON BURGER',
    description: '100% dana eti , dana bacon , cheddar peyniri , karamelize soğan , turşu , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 45895n,
    displayOrder: 3,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000076d83e95',
    availabilityId: '01900000-0000-7000-8000-00003d53e632',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '4-home-mushroom-burger',
    name: '4- HOME MUSHROOM BURGER',
    description: '100% dana eti , özel soslu mantar , cheddar peyniri , karamelize soğan , akdeniz yeşillikleri , domates , turşu , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 44895n,
    displayOrder: 4,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00006548416a',
    availabilityId: '01900000-0000-7000-8000-0000085be1b1',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '5-home-fire-burger',
    name: '5- HOME FIRE BURGER',
    description: '100% dana eti , mix biber , cheddar peyniri , acı sos , jalapeno biber , karamelize soğan , akdeniz yeşillikleri , domates , turşu , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 45795n,
    displayOrder: 5,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00005f9ee697',
    availabilityId: '01900000-0000-7000-8000-000032f23c10',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '6-home-3-shot-burger',
    name: '6- HOME 3 SHOT BURGER',
    description: '100% dana eti , [40gr X 3 adet dana eti] , [classic , cheese , lui] , özel burger ekmeği , patates kızartması',
    basePriceMinor: 48095n,
    displayOrder: 6,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00007735e4aa',
    availabilityId: '01900000-0000-7000-8000-00001a4984f1',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '7-home-diet-burger',
    name: '7- HOME DIET BURGER',
    description: '100% dana eti , iceberg marul içerisinde(tercihe göre kepekli ekmek ile) , taze nane , ızgara hellim peyniri , domates , mix biber , turşu , home sos , mevsim sebzeleri',
    basePriceMinor: 46495n,
    displayOrder: 7,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000037cec6fc',
    availabilityId: '01900000-0000-7000-8000-00005194f3dd',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '9-home-lui-burger',
    name: '9- HOME LUI BURGER',
    description: '100% dana eti , çift cheddar peyniri , coleslow salata , domates , turşu , kibrit patates , özel burger ekmeği , patates kızartması',
    basePriceMinor: 46295n,
    displayOrder: 8,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00007c91d142',
    availabilityId: '01900000-0000-7000-8000-000042ce9757',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '11-home-peak-burger',
    name: '11- HOME PEAK BURGER',
    description: '100% dana eti , trüff sos , cheddar peyniri , turşu , özel burger ekmeği , patates kızartması',
    basePriceMinor: 45795n,
    displayOrder: 9,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00002a8c8afb',
    availabilityId: '01900000-0000-7000-8000-00006b2c2262',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: '12-home-warm-burger',
    name: '12- HOME WARM BURGER',
    description: '100% dana eti , crispy sos , cheddar peyniri , turşu , özel burger ekmeği , patates kızartması',
    basePriceMinor: 45795n,
    displayOrder: 10,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000029c53d10',
    availabilityId: '01900000-0000-7000-8000-00004cd70817',
    categoryId: '01900000-0000-7000-8000-00000e359a1a',
    slug: 'home-craft-burger',
    name: 'HOME CRAFT BURGER',
    description: '100% dana eti , home craft bbq sos , cheddar peyniri , turşu , özel burger ekmeği , patates kızartması',
    basePriceMinor: 45795n,
    displayOrder: 11,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00002f4674cb',
    availabilityId: '01900000-0000-7000-8000-00001bf3b224',
    categoryId: '01900000-0000-7000-8000-00006db4fd36',
    slug: '13-home-crispy-chicken-burger',
    name: '13- HOME CRISPY CHICKEN BURGER',
    description: '100% çıtır tavuk fleto , cheddar peyniri , turşu , iceberg marul , mor lahana , home acı sos , (az acı %21) , özel burger ekmeği , patates kızartması',
    basePriceMinor: 43395n,
    displayOrder: 1,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000064a7aa8e',
    availabilityId: '01900000-0000-7000-8000-00004452c339',
    categoryId: '01900000-0000-7000-8000-00006db4fd36',
    slug: '14-home-truffle-chicken-burger',
    name: '14- HOME TRUFFLE CHICKEN BURGER',
    description: '100% çıtır tavuk fleto , cheddar peyniri , turşu , trüff sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 43895n,
    displayOrder: 2,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00002ebb1d12',
    availabilityId: '01900000-0000-7000-8000-00007a8ef84b',
    categoryId: '01900000-0000-7000-8000-00006db4fd36',
    slug: '15-home-chicken-burger',
    name: '15- HOME CHICKEN BURGER',
    description: '100% tavuk fleto , mozzarella peyniri , mix biber , karamelize soğan , taze nane , akdeniz yeşillikleri , domates , turşu , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 42995n,
    displayOrder: 3,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00002bc090f8',
    availabilityId: '01900000-0000-7000-8000-000008cc62d1',
    categoryId: '01900000-0000-7000-8000-00006db4fd36',
    slug: 'home-craft-chicken-burger',
    name: 'HOME CRAFT CHICKEN BURGER',
    description: '100% çıtır tavuk fleto , cheddar peyniri , turşu , iceberg marul , home craft bbq sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 43895n,
    displayOrder: 4,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000078d3d93a',
    availabilityId: '01900000-0000-7000-8000-0000423298d3',
    categoryId: '01900000-0000-7000-8000-00001c8a7a04',
    slug: '17-home-kids-chicken-burger',
    name: '17- HOME KIDS CHICKEN BURGER',
    description: '100% çıtır tavuk fleto , iceberg marul , domates , turşu , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 38795n,
    displayOrder: 1,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00002f801398',
    availabilityId: '01900000-0000-7000-8000-000007212ccf',
    categoryId: '01900000-0000-7000-8000-00001c8a7a04',
    slug: '18-home-kids-classic-burger',
    name: '18- HOME KIDS CLASSIC BURGER',
    description: '100% dana eti , akdeniz yeşillikleri , domates , turşu , home sos , özel burger ekmeği , patates kızartması',
    basePriceMinor: 40595n,
    displayOrder: 2,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000071dd9984',
    availabilityId: '01900000-0000-7000-8000-00002539c023',
    categoryId: '01900000-0000-7000-8000-000048358e31',
    slug: '1-home-classic-hotdog',
    name: '1- HOME CLASSIC HOTDOG',
    description: '100% dana sosis , turşu , home sos , hardal , özel sandviç ekmeği , patates kızartması',
    basePriceMinor: 39595n,
    displayOrder: 1,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00001e593508',
    availabilityId: '01900000-0000-7000-8000-00006b0a85d1',
    categoryId: '01900000-0000-7000-8000-000048358e31',
    slug: 'home-spicy-hotdog',
    name: 'HOME SPICY HOTDOG',
    description: '100% dana sosis , çift cheddar peyniri , turşu , home acı sos (az acı%21) , özel sandviç ekmeği , patates kızartması',
    basePriceMinor: 42995n,
    displayOrder: 2,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00002db227fd',
    availabilityId: '01900000-0000-7000-8000-000048ea1d2a',
    categoryId: '01900000-0000-7000-8000-000048358e31',
    slug: 'home-curry-hotdog',
    name: 'HOME CURRY HOTDOG',
    description: '100% dana sosis , çift cheddar peyniri , turşu , curry sos , yeşil soğan , özel sandviç ekmeği , patates kızartması',
    basePriceMinor: 41995n,
    displayOrder: 3,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00001fdbd7b6',
    availabilityId: '01900000-0000-7000-8000-000056c06d71',
    categoryId: '01900000-0000-7000-8000-000048358e31',
    slug: 'home-craft-hotdog',
    name: 'HOME CRAFT HOTDOG',
    description: '100% dana sosis , çift cheddar peyniri , turşu , home craft bbq sos , kibrit patates , özel sandviç ekmeği , patates kızartması',
    basePriceMinor: 42995n,
    displayOrder: 4,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-0000260b439a',
    availabilityId: '01900000-0000-7000-8000-00007d085cad',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'patates-kizartmasi',
    name: 'PATATES KIZARTMASI',
    description: '',
    basePriceMinor: 16595n,
    displayOrder: 1,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-0000322e6215',
    availabilityId: '01900000-0000-7000-8000-00002f18bf72',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'cheese-fries',
    name: 'CHEESE FRIES',
    description: '',
    basePriceMinor: 23595n,
    displayOrder: 2,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00007346011e',
    availabilityId: '01900000-0000-7000-8000-00004c1a677b',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'mix-aperatif-tabagi',
    name: 'MIX APERATİF TABAĞI',
    description: '2 mozzarella sticks 4 chicken tenders 4 soğan halkası 4 nugget 4 popcorn',
    basePriceMinor: 25395n,
    displayOrder: 3,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00006c61d345',
    availabilityId: '01900000-0000-7000-8000-000017cb362c',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'chicken-nuggets',
    name: 'CHICKEN NUGGETS',
    description: '',
    basePriceMinor: 17495n,
    displayOrder: 4,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000037473e81',
    availabilityId: '01900000-0000-7000-8000-0000521c7c58',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'mozzarella-sticks',
    name: 'MOZZARELLA STICKS',
    description: '',
    basePriceMinor: 21195n,
    displayOrder: 5,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000013e92d6a',
    availabilityId: '01900000-0000-7000-8000-00004c4c1e11',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'sogan-halkasi',
    name: 'SOĞAN HALKASI',
    description: '',
    basePriceMinor: 17495n,
    displayOrder: 6,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00003391a29f',
    availabilityId: '01900000-0000-7000-8000-000077d7c048',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'chicken-popcorn',
    name: 'CHICKEN POPCORN',
    description: '',
    basePriceMinor: 18395n,
    displayOrder: 7,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00003bc8d6ab',
    availabilityId: '01900000-0000-7000-8000-00006a706292',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'buffalo-chicken-tenders',
    name: 'BUFFALO CHICKEN TENDERS',
    description: '',
    basePriceMinor: 24595n,
    displayOrder: 8,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000071250bf9',
    availabilityId: '01900000-0000-7000-8000-00003a4456ee',
    categoryId: '01900000-0000-7000-8000-00001ccac113',
    slug: 'chicken-tenders',
    name: 'CHICKEN TENDERS',
    description: '',
    basePriceMinor: 21595n,
    displayOrder: 9,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000042ed1d1b',
    availabilityId: '01900000-0000-7000-8000-00000a8a2c74',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'limitsiz-cola',
    name: 'LİMİTSİZ COLA',
    description: '',
    basePriceMinor: 8495n,
    displayOrder: 1,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00007e513104',
    availabilityId: '01900000-0000-7000-8000-0000419c8d2b',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'coca-cola',
    name: 'COCA COLA',
    description: '',
    basePriceMinor: 8495n,
    displayOrder: 2,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-0000734bf1d1',
    availabilityId: '01900000-0000-7000-8000-00004747160a',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'coca-cola-zero',
    name: 'COCA COLA ZERO',
    description: '',
    basePriceMinor: 8495n,
    displayOrder: 3,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000005cb20c0',
    availabilityId: '01900000-0000-7000-8000-00007400a867',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'fanta',
    name: 'FANTA',
    description: '',
    basePriceMinor: 8495n,
    displayOrder: 4,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00003562fd3b',
    availabilityId: '01900000-0000-7000-8000-000023186ffe',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'sprite',
    name: 'SPRITE',
    description: '',
    basePriceMinor: 8495n,
    displayOrder: 5,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00000fb4eb6f',
    availabilityId: '01900000-0000-7000-8000-000068c4b928',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'fusetea-seftali-limon-mango-karpuz',
    name: 'FUSETEA (Şeftali,Limon,Mango,Karpuz)',
    description: '',
    basePriceMinor: 8495n,
    displayOrder: 6,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00000035f3d9',
    availabilityId: '01900000-0000-7000-8000-00005712a4ae',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'soda',
    name: 'SODA',
    description: '',
    basePriceMinor: 3895n,
    displayOrder: 7,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00007899aa73',
    availabilityId: '01900000-0000-7000-8000-000049f21e8c',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'meyveli-soda-limon-elma',
    name: 'MEYVELİ SODA (Limon,Elma)',
    description: '',
    basePriceMinor: 3895n,
    displayOrder: 8,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-0000058fa0e7',
    availabilityId: '01900000-0000-7000-8000-000073c5288e',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'ayran',
    name: 'AYRAN',
    description: '',
    basePriceMinor: 5595n,
    displayOrder: 9,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000000000e62',
    availabilityId: '01900000-0000-7000-8000-0000002d001b',
    categoryId: '01900000-0000-7000-8000-00007dcf860f',
    slug: 'su',
    name: 'SU',
    description: '',
    basePriceMinor: 2895n,
    displayOrder: 10,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00006e24d6f2',
    availabilityId: '01900000-0000-7000-8000-000038251a07',
    categoryId: '01900000-0000-7000-8000-000072529488',
    slug: 'home-classic-burger-menu',
    name: 'HOME CLASSIC BURGER MENÜ',
    description: '1 ADET 100 GR HOME CLASSIC BURGER + PATATES KIZARTMASI + 1 ADET POSMİX İÇECEK',
    basePriceMinor: 46595n,
    displayOrder: 1,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00002aec7e4f',
    availabilityId: '01900000-0000-7000-8000-00007b5d72aa',
    categoryId: '01900000-0000-7000-8000-000072529488',
    slug: 'home-chicken-burger-menu',
    name: 'HOME CHICKEN BURGER MENÜ',
    description: '1 ADET HOME CHICKEN BURGER + PATATES KIZARTMASI + 1 ADET POSMİX İÇECEK',
    basePriceMinor: 44595n,
    displayOrder: 2,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00007273e704',
    availabilityId: '01900000-0000-7000-8000-000041b83dc3',
    categoryId: '01900000-0000-7000-8000-000072529488',
    slug: 'home-spicy-hotdog-menu',
    name: 'HOME SPICY HOTDOG MENÜ',
    description: '1 ADET HOME SPICY HOTDOG + PATATES KIZARTMASI + 1 ADET POSMİX İÇECEK',
    basePriceMinor: 46595n,
    displayOrder: 3,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-00003af619b2',
    availabilityId: '01900000-0000-7000-8000-0000278319d5',
    categoryId: '01900000-0000-7000-8000-000072529488',
    slug: '2li-home-crispy-chicken-menu',
    name: '2\'Lİ HOME CRISPY CHICKEN MENÜ',
    description: '2 ADET HOME CRISPY CHICKEN BURGER + 2 ADET PATATES KIZARTMASI + 2 ADET POSMİX İÇECEK',
    basePriceMinor: 91995n,
    displayOrder: 4,
    allergenIds: [],
  },
  {
    id: '01900000-0000-7000-8000-000072937c97',
    availabilityId: '01900000-0000-7000-8000-0000308023b0',
    categoryId: '01900000-0000-7000-8000-000072529488',
    slug: '2li-home-warm-menu',
    name: '2\'Lİ HOME WARM MENÜ',
    description: '2 ADET 100 GR HOME WARM BURGER + 2 ADET PATATES KIZARTMASI + 2 ADET POSMİX İÇECEK',
    basePriceMinor: 99195n,
    displayOrder: 5,
    allergenIds: [],
  },];

async function upsertDemoCatalogProduct(item: SeedCatalogProduct): Promise<void> {
  await prisma.product.upsert({
    where: { id: item.id },
    create: {
      id: item.id,
      categoryId: item.categoryId,
      slug: item.slug,
      name: item.name,
      description: item.description,
      basePriceMinor: item.basePriceMinor,
      currency: 'TRY',
      displayOrder: item.displayOrder,
      isActive: true,
    },
    update: {
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      basePriceMinor: item.basePriceMinor,
      displayOrder: item.displayOrder,
      isActive: true,
    },
  });

  // Görsel URL'leri ve product_media kayıtları kaldırıldı. Ürün kartları
  // şu an görselsiz (placeholder) gösterilir; kullanıcı admin panelinden
  // dilediğinde görsel yükleyebilir.

  await prisma.branchProductAvailability.upsert({
    where: { branchId_productId: { branchId: IDS.downtown, productId: item.id } },
    create: {
      id: item.availabilityId,
      branchId: IDS.downtown,
      productId: item.id,
      isAvailable: true,
    },
    update: { isAvailable: true },
  });

  for (const allergenId of item.allergenIds) {
    await prisma.productAllergen.upsert({
      where: { productId_allergenId: { productId: item.id, allergenId: allergenId } },
      create: { productId: item.id, allergenId },
      update: {},
    });
  }
}

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, 64, {
    N: 1 << 15,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

function timeToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0));
}

async function main(): Promise<void> {
  await prisma.foundationProbe.upsert({
    where: { id: IDS.foundation },
    create: {
      id: IDS.foundation,
      label: 'seed:foundation-probe',
      amountMinor: 12990n,
    },
    update: {},
  });

  const permissionIds = new Map<string, string>();
  for (const p of CANONICAL_PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, description: p.description },
      update: { description: p.description },
    });
    permissionIds.set(p.code, row.id);
  }

  await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    create: {
      id: IDS.hqRole,
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Global administrator with full system access',
      isSystem: true,
    },
    update: { name: 'Super Admin', description: 'Global administrator with full system access' },
  });

  await prisma.role.upsert({
    where: { code: 'BRANCH_ADMIN' },
    create: {
      id: IDS.branchAdminRole,
      code: 'BRANCH_ADMIN',
      name: 'Şube Yöneticisi',
      description: 'Own-branch operations and staff permission management',
      isSystem: true,
    },
    update: {
      name: 'Şube Yöneticisi',
      description: 'Own-branch operations and staff permission management',
    },
  });

  await prisma.role.upsert({
    where: { code: 'BRANCH_USER' },
    create: {
      id: IDS.branchUserRole,
      code: 'BRANCH_USER',
      name: 'Şube Personeli',
      description: 'Ordinary staff assigned to one branch',
      isSystem: true,
    },
    update: { name: 'Şube Personeli', description: 'Ordinary staff assigned to one branch' },
  });

  await prisma.role.upsert({
    where: { code: 'COURIER' },
    create: {
      id: IDS.courierRole,
      code: 'COURIER',
      name: 'Courier',
      description: 'Courier delivery role',
      isSystem: true,
    },
    update: { name: 'Courier' },
  });

  for (const code of permissionIds.keys()) {
    const permissionId = permissionIds.get(code)!;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: IDS.hqRole, permissionId } },
      create: { roleId: IDS.hqRole, permissionId },
      update: {},
    });
  }
  const branchAdminPages = [
    'dashboard',
    'orders',
    'kitchen',
    'branches.service_areas',
    'branches.availability',
    'users',
    'reports',
  ];
  await prisma.rolePermission.deleteMany({ where: { roleId: IDS.branchAdminRole } });
  const branchAdminPermissions = new Set([
    'users.read',
    'users.write',
    'branches.read',
    'branches.write',
    'branches.service_areas.write',
    'orders.read',
    'orders.update_status',
    'couriers.assign',
    'admin.page.branches.view',
    'admin.page.branches.update',
    'admin.page.couriers.view',
    'admin.page.couriers.update',
    'reports.read',
    ...branchAdminPages.flatMap((page) =>
      CANONICAL_ADMIN_PAGE_PERMISSION_CODES.filter((code) =>
        code.startsWith(`admin.page.${page}.`),
      ),
    ),
  ]);
  for (const code of branchAdminPermissions) {
    const permissionId = permissionIds.get(code);
    if (!permissionId) continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: IDS.branchAdminRole, permissionId } },
      create: { roleId: IDS.branchAdminRole, permissionId },
      update: {},
    });
  }
  for (const code of ['couriers.read', 'orders.read'] as const) {
    const permissionId = permissionIds.get(code);
    if (!permissionId) continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: IDS.courierRole, permissionId } },
      create: { roleId: IDS.courierRole, permissionId },
      update: {},
    });
  }

  for (const cat of MENU_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
      update: {
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
    });
  }

  await prisma.allergen.upsert({
    where: { id: IDS.gluten },
    create: { id: IDS.gluten, code: 'GLUTEN', name: 'Gluten' },
    update: { name: 'Gluten' },
  });
  await prisma.allergen.upsert({
    where: { id: IDS.dairy },
    create: { id: IDS.dairy, code: 'DAIRY', name: 'Dairy' },
    update: { name: 'Dairy' },
  });

  // Branch must be created before products (FK on branch_product_availability).
  const seedBranchFirstAdministrator = await prisma.branchAdministrator.findUnique({
    where: { branchId: IDS.downtown },
    select: { user: { select: { status: true } } },
  });
  const seedBranchIsActive = seedBranchFirstAdministrator?.user.status === 'ACTIVE';
  await prisma.branch.upsert({
    where: { id: IDS.downtown },
    create: {
      id: IDS.downtown,
      code: 'IST-DT',
      name: 'Kadıköy Moda',
      addressLine: 'Moda Caddesi 12, Kadıköy, İstanbul',
      latitude: 41.0369,
      longitude: 28.9847,
      phone: '+902121234567',
      isActive: seedBranchIsActive,
      isAcceptingOrders: seedBranchIsActive,
      minOrderMinor: 5000n,
      deliveryFeeMinor: 1500n,
      estimatedDeliveryMinutesMin: 25,
      estimatedDeliveryMinutesMax: 35,
    },
    update: {
      name: 'Kadıköy Moda',
      addressLine: 'Moda Caddesi 12, Kadıköy, İstanbul',
      isActive: seedBranchIsActive,
      isAcceptingOrders: seedBranchIsActive,
      estimatedDeliveryMinutesMin: 25,
      estimatedDeliveryMinutesMax: 35,
    },
  });

  for (const item of DEMO_CATALOG_PRODUCTS) {
    await upsertDemoCatalogProduct(item);
  }

  await seedCatalogCustomization(prisma);

  const downtownAdministrator = await prisma.branchAdministrator.findUnique({
    where: { branchId: IDS.downtown },
    select: { user: { select: { status: true } } },
  });
  const downtownBranchIsActive = downtownAdministrator?.user.status === 'ACTIVE';
  await prisma.branch.update({
    where: { id: IDS.downtown },
    data: {
      isActive: downtownBranchIsActive,
      isAcceptingOrders: downtownBranchIsActive,
    },
  });

  await prisma.serviceArea.upsert({
    where: { id: IDS.serviceArea },
    create: {
      id: IDS.serviceArea,
      branchId: IDS.downtown,
      name: 'Downtown core',
      polygonGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [28.97, 41.02],
            [29.0, 41.02],
            [29.0, 41.05],
            [28.97, 41.05],
            [28.97, 41.02],
          ],
        ],
      },
      priority: 1,
      isActive: true,
    },
    update: { name: 'Downtown core', isActive: true },
  });

  const hours = [
    { dayOfWeek: 1, opensAt: '11:30', closesAt: '01:00' },
    { dayOfWeek: 2, opensAt: '11:30', closesAt: '01:00' },
    { dayOfWeek: 3, opensAt: '11:30', closesAt: '01:00' },
    { dayOfWeek: 4, opensAt: '11:30', closesAt: '01:00' },
    { dayOfWeek: 5, opensAt: '11:30', closesAt: '03:00' },
    { dayOfWeek: 6, opensAt: '11:30', closesAt: '03:00' },
    { dayOfWeek: 0, opensAt: '12:00', closesAt: '00:00' },
  ];
  for (const h of hours) {
    await prisma.branchOperatingHours.upsert({
      where: {
        branchId_dayOfWeek: { branchId: IDS.downtown, dayOfWeek: h.dayOfWeek },
      },
      create: {
        branchId: IDS.downtown,
        dayOfWeek: h.dayOfWeek,
        opensAt: timeToDate(h.opensAt),
        closesAt: timeToDate(h.closesAt),
        isClosed: false,
      },
      update: {
        opensAt: timeToDate(h.opensAt),
        closesAt: timeToDate(h.closesAt),
        isClosed: false,
      },
    });
  }

  // Vitrin merchandising kayıtları yeni ürünlere bağlanacak şekilde
  // yeniden yazılana kadar devre dışı. Mevcut vitrin seed'i eski demo
  // ürünlere (P.smash, P.bbq vs.) referans veriyor; onlar silindi.
  // await seedStorefrontHome(prisma);

  const configuredStaffPassword = process.env.SEED_STAFF_PASSWORD;
  if (process.env.NODE_ENV === 'production' && !configuredStaffPassword) {
    throw new Error('SEED_STAFF_PASSWORD is required when seeding in production.');
  }
  const staffPassword = configuredStaffPassword ?? 'DevStaffPass1!';
  const staffHash = await hashPassword(staffPassword);
  const courierIdentifier =
    process.env.SEED_COURIER_IDENTIFIER?.trim().toLowerCase() || 'courier@fastfood.local';
  const courierPassword = process.env.SEED_COURIER_PASSWORD || staffPassword;
  const courierHash = await hashPassword(courierPassword);
  await prisma.user.upsert({
    where: { id: IDS.staffUser },
    create: {
      id: IDS.staffUser,
      actorType: 'STAFF',
      status: 'ACTIVE',
      primaryIdentifier: 'staff@fastfood.local',
      primaryIdentifierType: 'EMAIL',
      displayName: 'Dev Staff',
      staffProfile: {
        create: {
          passwordHash: staffHash,
          passwordAlgo: 'scrypt',
          passwordUpdatedAt: new Date(),
        },
      },
    },
    update: {
      status: 'ACTIVE',
      displayName: 'Dev Staff',
      staffProfile: {
        upsert: {
          create: {
            passwordHash: staffHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
          update: {
            passwordHash: staffHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
        },
      },
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: IDS.staffUser, roleId: IDS.hqRole } },
    create: { userId: IDS.staffUser, roleId: IDS.hqRole },
    update: {},
  });
  await prisma.userBranchScope.deleteMany({ where: { userId: IDS.staffUser } });

  const downtownAdminAssignment = await prisma.branchAdministrator.findUnique({
    where: { branchId: IDS.downtown },
    select: { userId: true },
  });
  const demoAdminAssignment = await prisma.branchAdministrator.findUnique({
    where: { userId: IDS.branchStaffUser },
    select: { branchId: true },
  });
  if (
    (!downtownAdminAssignment || downtownAdminAssignment.userId === IDS.branchStaffUser) &&
    (!demoAdminAssignment || demoAdminAssignment.branchId === IDS.downtown)
  ) {
    await prisma.user.upsert({
      where: { id: IDS.branchStaffUser },
      create: {
        id: IDS.branchStaffUser,
        actorType: 'STAFF',
        status: 'ACTIVE',
        primaryIdentifier: 'branch.admin@fastfood.local',
        primaryIdentifierType: 'EMAIL',
        displayName: 'Kadıköy Şube Yöneticisi',
        staffProfile: {
          create: {
            passwordHash: staffHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
        },
      },
      update: {
        actorType: 'STAFF',
        status: 'ACTIVE',
        displayName: 'Kadıköy Şube Yöneticisi',
        staffProfile: {
          upsert: {
            create: {
              passwordHash: staffHash,
              passwordAlgo: 'scrypt',
              passwordUpdatedAt: new Date(),
            },
            update: {
              passwordHash: staffHash,
              passwordAlgo: 'scrypt',
              passwordUpdatedAt: new Date(),
            },
          },
        },
      },
    });
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: IDS.branchStaffUser, roleId: IDS.branchAdminRole },
      },
      create: {
        userId: IDS.branchStaffUser,
        roleId: IDS.branchAdminRole,
        grantedByUserId: IDS.staffUser,
      },
      update: {
        grantedByUserId: IDS.staffUser,
        revokedAt: null,
        expiresAt: null,
      },
    });
    await prisma.userBranchScope.deleteMany({ where: { userId: IDS.branchStaffUser } });
    await prisma.userBranchScope.create({
      data: { userId: IDS.branchStaffUser, branchId: IDS.downtown, scopeKind: 'assigned' },
    });
    await prisma.branchAdministrator.upsert({
      where: { branchId: IDS.downtown },
      create: {
        branchId: IDS.downtown,
        userId: IDS.branchStaffUser,
        assignedByUserId: IDS.staffUser,
      },
      update: { userId: IDS.branchStaffUser, assignedByUserId: IDS.staffUser },
    });
    await prisma.branch.update({
      where: { id: IDS.downtown },
      data: { isActive: true, isAcceptingOrders: true },
    });
  }

  await prisma.user.upsert({
    where: { id: IDS.courierUser },
    create: {
      id: IDS.courierUser,
      actorType: 'COURIER',
      status: 'ACTIVE',
      primaryIdentifier: courierIdentifier,
      primaryIdentifierType: 'EMAIL',
      displayName: 'Dev Courier',
      // Staff-auth endpoint is the local courier login path; password lives on StaffProfile.
      staffProfile: {
        create: {
          passwordHash: courierHash,
          passwordAlgo: 'scrypt',
          passwordUpdatedAt: new Date(),
        },
      },
    },
    update: {
      status: 'ACTIVE',
      primaryIdentifier: courierIdentifier,
      primaryIdentifierType: 'EMAIL',
      displayName: 'Dev Courier',
      staffProfile: {
        upsert: {
          create: {
            passwordHash: courierHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
          update: {
            passwordHash: courierHash,
            passwordAlgo: 'scrypt',
            passwordUpdatedAt: new Date(),
          },
        },
      },
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: IDS.courierUser, roleId: IDS.courierRole } },
    create: { userId: IDS.courierUser, roleId: IDS.courierRole },
    update: {},
  });
  await prisma.courierProfile.upsert({
    where: { id: IDS.courierProfile },
    create: {
      id: IDS.courierProfile,
      userId: IDS.courierUser,
      displayName: 'Dev Courier',
      phone: '+905551112233',
      isActive: true,
      maxActiveDeliveries: 3,
    },
    update: { displayName: 'Dev Courier', isActive: true },
  });

  await seedClubEngagement(prisma);
  // Vitrin merchandising kayıtları yeni ürünlere bağlanacak şekilde
  // yeniden yazılana kadar devre dışı. Mevcut seedStorefrontCompleteness
  // eski demo ürünlere (P.smash, P.bbq vs.) referans veriyor; onlar silindi.
  // await seedStorefrontCompleteness(prisma);

  console.log(
    `seed: foundation + ${CANONICAL_PERMISSIONS.length} permissions + ${DEMO_CATALOG_PRODUCTS.length} catalog products/branch/staff/courier + club/gamification + completeness upserted`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.warn(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
