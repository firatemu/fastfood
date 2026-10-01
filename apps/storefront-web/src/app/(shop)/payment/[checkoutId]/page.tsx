import { PaymentStatusPage } from '../../../../components/storefront/payment-status-page';

export const metadata = {
  title: 'Güvenli ödeme | BURGER HOME',
  description: 'iyzico 3-D Secure sandbox ödeme ve sipariş özeti.',
};

export default function PaymentRoute() {
  return <PaymentStatusPage />;
}
