import { AccountDeletionInfoPage } from '../../../components/storefront/account-deletion-info-page';

export const metadata = {
  title: 'Hesap Silme | BURGER HOME',
  description: 'BURGER HOME hesabını ve kişisel verilerini silme adımları.',
};

export default async function AccountDeletionRoute({
  searchParams,
}: {
  searchParams: Promise<{ silindi?: string }>;
}) {
  const { silindi } = await searchParams;
  return <AccountDeletionInfoPage deleted={silindi === '1'} />;
}
