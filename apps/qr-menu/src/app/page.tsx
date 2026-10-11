import { QrMenuApp } from '../components/qr-menu-app';
import { getQrMenuData } from '../lib/menu-data';

export const revalidate = 60;

export default async function QrMenuPage() {
  const menu = await getQrMenuData();
  return <QrMenuApp menu={menu} />;
}