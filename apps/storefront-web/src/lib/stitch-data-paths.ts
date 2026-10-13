/** Stitch `data-path` attributes → Next.js app routes. */
export const DATA_PATH_ROUTES: Record<string, string> = {
  menu: '/',
  'subeler-and-hikaye': '/branches',
  'indirimler-and-firsatlar': '/deals',
  hesabim: '/account',
  'siparis-takibi': '/orders',
  kvkk: '/kvkk',
  'gizlilik-sozlesmesi': '/gizlilik',
  gizlilik: '/gizlilik',
  'hesap-silme': '/hesap-silme',
  'kullanim-kosullari': '/kullanim-kosullari',
  'alerjen-rehberi': '/legal#alerjen-sozlugu',
  'mesafeli-satis-sozlesmesi': '/mesafeli-satis-sozlesmesi',
  'mesafeli-satis': '/mesafeli-satis-sozlesmesi',
  'on-bilgilendirme-formu': '/on-bilgilendirme-formu',
  'on-bilgilendirme': '/on-bilgilendirme-formu',
  'iptal-ve-iade': '/iptal-ve-iade',
  'iptal-iade': '/iptal-ve-iade',
  'cerez-politikasi': '/cerez-politikasi',
  cerezler: '/cerez-politikasi',
  kunye: '/kunye',
  'teslimat-kosullari': '/teslimat-kosullari',
  legal: '/legal',
};

export function routeForDataPath(dataPath: string): string | null {
  const key = dataPath.trim().toLowerCase();
  return DATA_PATH_ROUTES[key] ?? null;
}
