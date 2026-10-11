import { QrMenuApp } from '../components/qr-menu-app';
import { getQrMenuData } from '../lib/menu-data';

// Rendered per request: container images are built without a reachable API,
// so the page cannot be prerendered. Menu fetches keep their own
// `next.revalidate` data cache (QR_MENU_REVALIDATE_SECONDS).
export const dynamic = 'force-dynamic';

export default async function QrMenuPage() {
  const menu = await getQrMenuData();
  return <QrMenuApp menu={menu} />;
}
