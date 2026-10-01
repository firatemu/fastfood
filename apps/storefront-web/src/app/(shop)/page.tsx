import { GoldenHomePage } from '../../components/storefront/golden-home-page';

export const metadata = {
  title: 'BURGER HOME',
  description: 'BURGER HOME canlı menü ve sipariş.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return <GoldenHomePage />;
}
