/** Stitch `data-path` attributes → Next.js app routes. */
export const DATA_PATH_ROUTES: Record<string, string> = {
  menu: '/',
  'subeler-and-hikaye': '/branches',
  'indirimler-and-firsatlar': '/deals',
  hesabim: '/account',
  'siparis-takibi': '/orders',
  kvkk: '/legal',
  'gizlilik-sozlesmesi': '/legal',
  'kullanim-kosullari': '/legal',
  'alerjen-rehberi': '/legal',
};

export function routeForDataPath(dataPath: string): string | null {
  const key = dataPath.trim().toLowerCase();
  return DATA_PATH_ROUTES[key] ?? null;
}
