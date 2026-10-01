'use client';

import { useState, type FormEvent } from 'react';

import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { completeSandboxIyzico } from '../../lib/storefront/checkout';

import { MaterialIcon } from './material-icon';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCardNumber(value: string): string {
  return digitsOnly(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

export function IyzicoHostedPanel({
  amountMinor,
  currency,
  providerPaymentId,
  onPaid,
}: {
  amountMinor: string;
  currency: string;
  providerPaymentId: string | null;
  onPaid: () => void;
}) {
  const [pan, setPan] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holder, setHolder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panDigits = digitsOnly(pan);
  const expiryDigits = digitsOnly(expiry);
  const cvcDigits = digitsOnly(cvc);
  const canPay =
    Boolean(providerPaymentId) &&
    panDigits.length >= 13 &&
    expiryDigits.length === 4 &&
    cvcDigits.length >= 3 &&
    holder.trim().length >= 2 &&
    !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canPay || !providerPaymentId) return;
    setBusy(true);
    setError(null);
    try {
      await completeSandboxIyzico(providerPaymentId);
      setPan('');
      setExpiry('');
      setCvc('');
      onPaid();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

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
          Sandbox · kart FASTFOOD’a gitmez
        </span>
      </div>
      <h2 className="font-headline-md text-headline-md uppercase tracking-tight">Kart ile öde</h2>
      <p className="font-body-sm text-on-surface-variant">
        Kart numarası, SKT ve CVC iyzico sandbox formunda kalır. BURGER HOME yalnızca ödeme sonucunu
        doğrular.
      </p>
      <form
        className="flex flex-col gap-space-md"
        autoComplete="off"
        onSubmit={(event) => void submit(event)}
      >
        <div>
          <label
            className="block font-label-sm uppercase text-on-surface-variant mb-1"
            htmlFor="iyzico-pan"
          >
            Kart Numarası
          </label>
          <input
            id="iyzico-pan"
            className="w-full bg-surface-container text-on-surface font-body-sm rounded-lg px-space-md py-2.5 outline-none focus:ring-1 focus:ring-primary-container"
            inputMode="numeric"
            autoComplete="off"
            name="iyzico-sandbox-pan"
            placeholder="•••• •••• •••• ••••"
            value={pan}
            onChange={(event) => setPan(formatCardNumber(event.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-space-md">
          <div>
            <label
              className="block font-label-sm uppercase text-on-surface-variant mb-1"
              htmlFor="iyzico-expiry"
            >
              Son Kullanma
            </label>
            <input
              id="iyzico-expiry"
              className="w-full bg-surface-container text-on-surface font-body-sm rounded-lg px-space-md py-2.5 outline-none focus:ring-1 focus:ring-primary-container"
              inputMode="numeric"
              autoComplete="off"
              name="iyzico-sandbox-expiry"
              placeholder="AA / YY"
              value={expiry}
              onChange={(event) => setExpiry(formatExpiry(event.target.value))}
            />
          </div>
          <div>
            <label
              className="block font-label-sm uppercase text-on-surface-variant mb-1"
              htmlFor="iyzico-cvc"
            >
              CVV / CVC
            </label>
            <input
              id="iyzico-cvc"
              className="w-full bg-surface-container text-on-surface font-body-sm rounded-lg px-space-md py-2.5 outline-none focus:ring-1 focus:ring-primary-container"
              inputMode="numeric"
              autoComplete="off"
              name="iyzico-sandbox-cvc"
              type="password"
              placeholder="•••"
              value={cvc}
              onChange={(event) => setCvc(digitsOnly(event.target.value).slice(0, 4))}
            />
          </div>
        </div>
        <div>
          <label
            className="block font-label-sm uppercase text-on-surface-variant mb-1"
            htmlFor="iyzico-holder"
          >
            Kart Sahibi
          </label>
          <input
            id="iyzico-holder"
            className="w-full bg-surface-container text-on-surface font-body-sm rounded-lg px-space-md py-2.5 outline-none focus:ring-1 focus:ring-primary-container"
            autoComplete="off"
            name="iyzico-sandbox-holder"
            placeholder="Ad Soyad"
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
          />
        </div>
        {error ? <p className="font-body-sm text-error">{error}</p> : null}
        {!providerPaymentId ? (
          <p className="font-body-sm text-error">
            Ödeme oturumu bulunamadı. Checkout’tan yeniden dene.
          </p>
        ) : null}
        <button
          className="w-full py-3 px-space-md rounded-xl bg-secondary-container text-on-secondary-container font-label-lg uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40"
          type="submit"
          disabled={!canPay}
          data-ff-iyzico-pay
        >
          {busy
            ? 'Ödeme doğrulanıyor…'
            : `Ödemeyi tamamla • ${formatTryMinor(amountMinor, currency)}`}
        </button>
      </form>
    </section>
  );
}
