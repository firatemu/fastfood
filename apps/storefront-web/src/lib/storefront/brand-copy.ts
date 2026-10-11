/** Visual brand constants from the Stitch Home anatomy — not catalog data. */

export const BRAND_NAME = 'BURGER HOME';
export const LOYALTY_PROGRAM_NAME = 'BURGER HOME CLUB';
export const WORDMARK_SRC = '/storefront/assets/brand/burger-home-wordmark.png';
export const SEARCH_PLACEHOLDER = 'Burger, sos veya çıtır ara...';
export const ACCOUNT_AVATAR_SRC = '/storefront/assets/brand/account-avatar.jpg';

export const BRAND_BLURB =
  'Yüksek ısıyla mühürlenen %100 yerli dana döş, patatesli taze brioche ekmeği ve gizli ev yapımı soslar. Gerçek smash lezzeti.';

export const GRILL_LIVE_LABEL = 'Alevli Döküm 280°C Aktif';

export const PDP_QUALITY_STRIP = [
  { icon: 'timer', title: '3 Dakika Smash Tekniği', body: 'Sıcak ve sulu iç doku', iconClass: 'text-secondary-container' },
  { icon: 'eco', title: '%100 Yerli Besi', body: 'Trakya meraları dana eti', iconClass: 'text-primary' },
  { icon: 'inventory_2', title: 'Hava Kanallı Termal Paket', body: 'Çıtırlık kaybı önleyici', iconClass: 'text-tertiary' },
] as const;

export const PROMISE_STRIP = [
  { icon: 'skillet', title: 'Cast Iron Smashed', body: 'Özel ağırlıkla 15 saniye pres', iconClass: 'text-primary-container' },
  { icon: 'verified', title: '%100 Yerli Dana', body: 'Sıfır katkı, taze çekim döş', iconClass: 'text-secondary' },
  { icon: 'bakery_dining', title: 'Brioche Ekmek', body: 'Her sabah saat 08:00 fırından', iconClass: 'text-primary' },
  { icon: 'bolt', title: 'Termal Ambalaj', body: 'İlk anki sıcaklığında kapında', iconClass: 'text-tertiary-container' },
] as const;

export const HERO_FLOAT_FIRE = {
  title: '280°C Döküm',
  body: 'Kusursuz Maillard Reaksiyonu',
} as const;

export const FOOTER_PROMISES = [
  { icon: 'verified', text: '%100 Taze Kuru Dinlendirilmiş Dana Eti' },
  { icon: 'bakery_dining', text: 'Günlük Tereyağlı Brioche Ekmeği' },
] as const;

export const NAV_ITEMS = [
  { href: '/menu', label: 'Menü', dataPath: 'menu' },
  { href: '/branches', label: 'Şubeler', dataPath: 'subeler-and-hikaye' },
  { href: '/deals', label: 'Kampanyalar', dataPath: 'indirimler-and-firsatlar' },
] as const;
