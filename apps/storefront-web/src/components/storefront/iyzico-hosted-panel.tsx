'use client';

import { formatTryMinor } from '../../lib/money';

import { MaterialIcon } from './material-icon';

/**
 * ADR-022: card data and 3-D Secure live on iyzico's hosted Checkout Form.
 * This panel only explains the state and can reopen the hosted page; the
 * outcome always comes from the server-verified checkout status.
 */
export function IyzicoHostedPanel({
  amountMinor,
  currency,
  redirectUrl,
  onRefresh,
}: {
  amountMinor: string;
  currency: string;
  redirectUrl: string | null;
  onRefresh: () => void;
}) {
  return (
    <section
      className="bg-surface-container-low rounded-xl p-space-md lg:p-space-lg shadow-md flex flex-col gap-space-md"
      data-ff-iyzico-hosted
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-container">
          <MaterialIcon name="lock" filled className="text-lg" />
          <span className="font-label-sm uppercase">iyzico 3-D Secure</span>
        </div>
        <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">
          Kart bilgisi BURGER HOME’a gelmez
        </span>
      </div>
      <h2 className="font-headline-md text-headline-md uppercase tracking-tight">
        Ödeme bekleniyor
      </h2>
      <p className="font-body-sm text-on-surface-variant">
        Kart bilgilerini iyzico’nun güvenli ödeme sayfasında gir ve 3-D Secure doğrulamasını
        tamamla. Sonuç iyzico’dan doğrulanınca bu sayfa kendiliğinden güncellenir.
      </p>
      <p className="font-headline-md text-headline-md">{formatTryMinor(amountMinor, currency)}</p>
      {redirectUrl ? (
        <a
          className="w-full py-3 px-space-md rounded-xl bg-secondary-container text-on-secondary-container font-label-lg uppercase tracking-wide flex items-center justify-center gap-2"
          href={redirectUrl}
          data-ff-iyzico-open
        >
          <MaterialIcon name="open_in_new" className="text-lg" />
          iyzico ödeme sayfasını aç
        </a>
      ) : null}
      <button
        type="button"
        className="w-full py-3 px-space-md rounded-xl border border-outline-variant font-label-lg uppercase tracking-wide"
        onClick={onRefresh}
        data-ff-iyzico-refresh
      >
        Durumu yenile
      </button>
    </section>
  );
}
