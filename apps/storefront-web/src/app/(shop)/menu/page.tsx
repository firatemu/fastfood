import { MenuPage } from '../../../components/storefront/menu-page';

export const metadata = {
  title: 'Menü | BURGER HOME',
  description: 'BURGER HOME menüsündeki smash burgerleri, yan lezzetleri ve içecekleri keşfet.',
  alternates: { canonical: '/menu' },
};

export default function MenuRoute() {
  return <MenuPage />;
}
