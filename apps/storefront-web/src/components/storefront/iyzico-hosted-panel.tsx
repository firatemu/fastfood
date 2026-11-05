'use client';

import { useState } from 'react';

import { formatTryMinor } from '../../lib/money';
import { completeSandboxPayment } from '../../lib/storefront/checkout';

import { MaterialIcon } from './material-icon';

export interface IyzicoHostedPanelProps {
  amountMinor: string;
  currency: string;
  redirectUrl: string | null;
  providerPaymentId?: string | null;
  checkoutId?: string;
  onRefresh: () => void;
}

export function IyzicoHostedPanel({
  amountMinor,
  currency,
  redirectUrl,
  providerPaymentId,
  onRefresh,
}: IyzicoHostedPanelProps) {
  // Test card pre-configurations
  const [testCardType, setTestCardType] = useState<'success' | 'insufficient' | 'invalid'>('success');
  const [cardNumber, setCardNumber] = useState('5890 0400 0000 0016');
  const [cardHolder, setCardHolder] = useState('BURGER HOME GURME');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  // Modal & Flow states
  const [show3DSModal, setShow3DSModal] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Resolved providerPaymentId (from props or sessionStorage)
  const resolvedProviderPaymentId =
    providerPaymentId ||
    (typeof window !== 'undefined'
      ? window.sessionStorage.getItem('ff_provider_payment_id')
      : null);

  function selectTestCard(type: 'success' | 'insufficient' | 'invalid') {
    setTestCardType(type);
    setPaymentError(null);
    if (type === 'success') {
      setCardNumber('5890 0400 0000 0016');
      setCardHolder('BURGER HOME GURME');
    } else if (type === 'insufficient') {
      setCardNumber('5890 0400 0000 0024');
      setCardHolder('TEST BAKİYE YETERSİZ');
    } else {
      setCardNumber('5890 0400 0000 0032');
      setCardHolder('TEST HATALI KART');
    }
  }

  function handleStartPayment() {
    setPaymentError(null);
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      setPaymentError('Lütfen geçerli bir 16 haneli kart numarası giriniz.');
      return;
    }
    if (testCardType === 'insufficient') {
      setPaymentError('Ödeme Başarısız: Kartınızda yeterli bakiye bulunmamaktadır (Hata Kodu: 5051).');
      if (resolvedProviderPaymentId) {
        void completeSandboxPayment(resolvedProviderPaymentId, 'FAILED');
      }
      return;
    }
    if (testCardType === 'invalid') {
      setPaymentError('Ödeme Başarısız: Kartınız banka tarafından onaylanmadı (Hata Kodu: 5012).');
      if (resolvedProviderPaymentId) {
        void completeSandboxPayment(resolvedProviderPaymentId, 'FAILED');
      }
      return;
    }

    // Başarılı akış için 3-D Secure doğrulama modalını aç
    setShow3DSModal(true);
  }

  async function handleConfirm3DS() {
    if (!otpCode || otpCode.trim().length !== 6) {
      setPaymentError('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      if (resolvedProviderPaymentId) {
        await completeSandboxPayment(resolvedProviderPaymentId, 'PAID');
      }
      setPaymentSuccess(true);
      // Durumu hemen yenileyerek router'ın onay sayfasına geçmesini sağla
      onRefresh();
    } catch {
      setPaymentError('Ödeme onaylanırken bir hata oluştu. Lütfen tekrar deneyiniz.');
      setProcessing(false);
    }
  }

  return (
    <section
      className="bg-[#12151f]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-6 relative overflow-hidden"
      data-ff-iyzico-hosted
    >
      {/* Ambient background light */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
            <MaterialIcon name="lock" filled className="text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-anton text-sm uppercase tracking-wider text-white">
                iyzico 3-D Secure
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/25 text-amber-300 font-anton text-[10px] uppercase tracking-wider">
                Sandbox Test Ortamı
              </span>
            </div>
            <p className="text-[11px] font-sans text-neutral-400 mt-0.5">
              256-Bit SSL Şifreli Güvenli Ödeme Altyapısı
            </p>
          </div>
        </div>

        <div className="text-right self-start sm:self-auto">
          <span className="block text-[10px] font-anton uppercase tracking-wider text-neutral-400">
            Ödenecek Tutar
          </span>
          <span className="font-anton text-2xl text-amber-400 font-bold leading-none">
            {formatTryMinor(amountMinor, currency)}
          </span>
        </div>
      </div>

      {redirectUrl ? (
        /* Gerçek dış yönlendirme URL'i varsa */
        <div className="flex flex-col gap-4">
          <p className="font-sans text-sm text-neutral-300 leading-relaxed">
            Kart bilgilerini iyzico’nun güvenli ödeme sayfasında gir ve 3-D Secure doğrulamasını tamamla.
          </p>
          <a
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 font-anton text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_6px_25px_rgba(254,179,0,0.35)] hover:scale-[1.01] transition-all"
            href={redirectUrl}
            data-ff-iyzico-open
          >
            <MaterialIcon name="open_in_new" className="text-lg" />
            iyzico Ödeme Sayfasını Aç
          </a>
        </div>
      ) : (
        /* Sandbox Deneme Ödeme Penceresi (Kullanıcının talep ettiği pencere) */
        <div className="flex flex-col gap-5">
          {/* Test Kartları Seçim Çipleri */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-anton text-xs uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <MaterialIcon name="credit_card" className="text-amber-400 text-sm" />
                Hazır Sandbox Test Kartları (1-Tıkla Doldur)
              </span>
              <span className="text-[10px] text-neutral-400 font-sans">Otomatik doldurur</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectTestCard('success')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  testCardType === 'success'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                    : 'bg-[#0e111a] border-white/[0.08] text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-anton text-xs uppercase tracking-wider text-emerald-400">
                    Başarılı Kart
                  </span>
                </div>
                <span className="block text-[11px] font-mono text-neutral-300 mt-1">
                  ... 0016 (Onaylanır)
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectTestCard('insufficient')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  testCardType === 'insufficient'
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_12px_rgba(254,179,0,0.2)]'
                    : 'bg-[#0e111a] border-white/[0.08] text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-anton text-xs uppercase tracking-wider text-amber-400">
                    Bakiye Yetersiz
                  </span>
                </div>
                <span className="block text-[11px] font-mono text-neutral-300 mt-1">
                  ... 0024 (Red)
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectTestCard('invalid')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  testCardType === 'invalid'
                    ? 'bg-rose-500/15 border-rose-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                    : 'bg-[#0e111a] border-white/[0.08] text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="font-anton text-xs uppercase tracking-wider text-rose-400">
                    Hatalı Kart
                  </span>
                </div>
                <span className="block text-[11px] font-mono text-neutral-300 mt-1">
                  ... 0032 (Red)
                </span>
              </button>
            </div>
          </div>

          {/* Kart Giriş Formu */}
          <div className="bg-[#0e111a]/95 border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-inner">
            {/* Kart Numarası */}
            <div>
              <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1.5">
                Kart Numarası
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="5890 0400 0000 0016"
                  className="w-full bg-[#141824] border border-white/[0.1] text-white font-mono text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all pr-12"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="font-anton text-[10px] text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 uppercase">
                    Mastercard
                  </span>
                </div>
              </div>
            </div>

            {/* Kart Sahibi */}
            <div>
              <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1.5">
                Kart Sahibinin Adı Soyadı
              </label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Adınız Soyadınız"
                className="w-full bg-[#141824] border border-white/[0.1] text-white font-sans text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
              />
            </div>

            {/* Son Kullanma & CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1.5">
                  Son Kullanma (AA/YY)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/28"
                  className="w-full bg-[#141824] border border-white/[0.1] text-white font-mono text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1.5">
                  Güvenlik Kodu (CVV)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  className="w-full bg-[#141824] border border-white/[0.1] text-white font-mono text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
                />
              </div>
            </div>
          </div>

          {paymentError ? (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-sans text-xs flex items-center gap-2">
              <MaterialIcon name="error" className="text-base shrink-0" />
              <span>{paymentError}</span>
            </div>
          ) : null}

          {/* Sandbox Ödeme Başlat Butonu */}
          <button
            type="button"
            onClick={handleStartPayment}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 active:scale-[0.99] text-neutral-950 font-anton text-base uppercase tracking-wider shadow-[0_6px_25px_rgba(254,179,0,0.35)] flex items-center justify-center gap-2.5 transition-all"
          >
            <MaterialIcon name="shield" filled className="text-xl" />
            <span>iyzico ile Güvenli Öde (Sandbox) • {formatTryMinor(amountMinor, currency)}</span>
          </button>
        </div>
      )}

      {/* Durumu Yenile Butonu (Mevcut test uyumluluğu) */}
      <button
        type="button"
        className="w-full py-3 px-4 rounded-xl border border-white/[0.08] hover:border-white/[0.2] bg-[#0e111a] text-neutral-300 hover:text-white font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
        onClick={onRefresh}
        data-ff-iyzico-refresh
      >
        <MaterialIcon name="refresh" className="text-base" />
        <span>Ödeme Durumunu Kontrol Et</span>
      </button>

      {/* 3-D SECURE BANKA ONAY MODALI (Penceresi) */}
      {show3DSModal ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#12151f] border border-white/[0.15] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="font-anton text-base uppercase tracking-wide text-white">
                  iyzico 3-D Secure Doğrulama
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MaterialIcon name="verified_user" className="text-base" filled />
              </div>
            </div>

            {paymentSuccess ? (
              /* Başarı Ekranı */
              <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(52,211,153,0.4)] animate-bounce">
                  ✓
                </div>
                <h3 className="font-anton text-xl uppercase text-white tracking-wide">
                  Ödeme Başarıyla Alındı!
                </h3>
                <p className="font-sans text-xs text-neutral-300">
                  Siparişiniz onaylanıyor, BURGER HOME onay sayfasına aktarılıyorsunuz...
                </p>
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mt-2" />
              </div>
            ) : (
              /* Doğrulama Formu */
              <>
                <div className="bg-[#0e111a] border border-white/[0.06] rounded-xl p-3.5 text-xs font-sans text-neutral-300 flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">İşyeri:</span>
                    <span className="text-white font-semibold">BURGER HOME</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Tutar:</span>
                    <span className="text-amber-400 font-bold font-anton text-sm">
                      {formatTryMinor(amountMinor, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Kart Numarası:</span>
                    <span className="font-mono text-white">
                      •••• •••• •••• {cardNumber.replace(/\s/g, '').slice(-4) || '0016'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-sans text-neutral-300">
                    Cep telefonunuza gönderilen <strong>6 haneli SMS onay kodunu</strong> giriniz:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full bg-[#141824] border border-white/[0.15] text-white font-mono text-xl tracking-widest text-center py-2.5 rounded-xl outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setOtpCode('123456')}
                      className="shrink-0 px-3 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 font-anton text-xs uppercase"
                    >
                      Doldur
                    </button>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-sans">
                    Sandbox test doğrulama kodu: <strong>123456</strong>
                  </span>
                </div>

                {paymentError ? (
                  <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                    {paymentError}
                  </p>
                ) : null}

                {/* Modal Aksiyonları */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void handleConfirm3DS()}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-anton text-sm uppercase tracking-wider shadow-[0_4px_16px_rgba(52,211,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                        <span>Doğrulanıyor...</span>
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="check_circle" className="text-base" />
                        <span>Onayla ve Bitir</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setShow3DSModal(false)}
                    className="py-3 px-4 rounded-xl border border-white/[0.1] text-neutral-400 hover:text-white font-anton text-xs uppercase"
                  >
                    Vazgeç
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
