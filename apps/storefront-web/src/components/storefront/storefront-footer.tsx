'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import {
  BRAND_BLURB,
  BRAND_NAME,
  FOOTER_PROMISES,
} from '../../lib/storefront/brand-copy';
import { subscribeNewsletter, type StorefrontHome } from '../../lib/storefront/home';
import { groupOperatingHours } from '../../lib/storefront/hours';

import { BrandLogo } from './brand-logo';
import { MaterialIcon } from './material-icon';

export function StorefrontFooter({
  home,
  homeStatus = 'ready',
}: {
  home: StorefrontHome | null;
  homeStatus?: 'ready' | 'loading' | 'error';
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'dup' | 'error'>('idle');
  const hours = home?.branch ? groupOperatingHours(home.branch.hours) : [];
  const year = new Date().getFullYear();

  async function onSubscribe(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');
    try {
      const result = await subscribeNewsletter(email);
      setStatus(result.alreadySubscribed ? 'dup' : 'ok');
    } catch {
      setStatus('error');
    }
  }

  return (
    <footer className="w-full bg-surface-container-lowest border-t border-surface-container">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl flex flex-col gap-space-xl">
        {/* Üst Bölüm: Marka, Çalışma Saatleri, Taahhüt, Bülten */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xl pb-space-lg border-b border-surface-container/60">
          {/* Kolon 1: Marka ve İletişim */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-sm mb-space-xs">
              <BrandLogo />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">{BRAND_BLURB}</p>
            <div className="flex items-center gap-space-sm mt-space-xs">
              {home?.branch?.phone ? (
                <a
                  href={`tel:${home.branch.phone}`}
                  className="p-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                  aria-label="Ara"
                >
                  <MaterialIcon name="call" className="text-lg" />
                </a>
              ) : null}
              <Link
                href="/kunye"
                className="p-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                aria-label="Künye ve İletişim"
              >
                <MaterialIcon name="alternate_email" className="text-lg" />
              </Link>
              <Link
                href="/branches"
                className="p-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                aria-label="Şubeler"
              >
                <MaterialIcon name="public" className="text-lg" />
              </Link>
            </div>
          </div>

          {/* Kolon 2: Çalışma Saatleri */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
              Çalışma Saatleri
            </span>
            {hours.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {homeStatus === 'loading'
                  ? 'Saatler yükleniyor…'
                  : 'Çalışma saati bu şubede yayımlanmadı.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
                {hours.map((row) => (
                  <li key={row.label} className="flex justify-between items-center py-1 gap-space-md">
                    <span className="text-on-surface-variant">{row.label}:</span>
                    <span className={`font-label-sm ${row.weekend ? 'text-secondary' : 'text-on-surface'}`}>
                      {row.opensAt} - {row.closesAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 mt-space-xs text-primary-container">
              <MaterialIcon name="local_fire_department" className="text-sm" />
              <span className="font-label-sm text-label-sm uppercase font-bold">Ateş Hiç Sönmüyor</span>
            </div>
          </div>

          {/* Kolon 3: Gurme Taahhüdü */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
              Gurme Taahhüdü
            </span>
            <ul className="flex flex-col gap-3 font-body-sm text-body-sm text-on-surface-variant">
              {FOOTER_PROMISES.map((item) => (
                <li key={item.text} className="flex items-start gap-2">
                  <MaterialIcon name={item.icon} className="text-primary text-base shrink-0 mt-0.5" />
                  <span>{item.text}</span>
                </li>
              ))}
              <li className="flex items-start gap-2">
                <MaterialIcon name="restaurant" className="text-primary text-base shrink-0 mt-0.5" />
                <Link
                  href="/legal#alerjen-sozlugu"
                  data-path="alerjen-rehberi"
                  className="text-on-surface-variant hover:text-on-surface transition-colors underline decoration-outline-variant"
                >
                  Şeffaf Alerjen ve Besin Rehberi
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolon 4: Ember Kulübü */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
              Ember Kulübü
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Gizli menü tadımları, gece indirimi fırsatları ve şef özel sos bülteni için katılın.
            </p>
            <form className="flex flex-col gap-2 mt-space-xs" onSubmit={onSubscribe}>
              <div className="flex items-center bg-surface-container-low rounded-lg p-1">
                <input
                  className="w-full px-3 py-2 bg-transparent text-on-surface placeholder:text-on-surface-variant/50 font-body-sm text-body-sm outline-none"
                  placeholder="E-posta adresiniz"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="E-posta adresiniz"
                />
                <button
                  className="px-space-md py-2 rounded-lg bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase shrink-0 hover:brightness-110 transition-all font-bold disabled:opacity-50"
                  type="submit"
                  disabled={status === 'saving'}
                >
                  Katıl
                </button>
              </div>
              <span className="font-label-sm text-[10px] text-on-surface-variant/70" aria-live="polite">
                {status === 'ok'
                  ? 'Ember Kulübü’ne katıldınız.'
                  : status === 'dup'
                    ? 'Bu e-posta zaten kayıtlı.'
                    : status === 'error'
                      ? 'Kayıt başarısız. Tekrar deneyin.'
                      : 'Dilediğiniz zaman tek tıkla ayrılabilirsiniz.'}
              </span>
            </form>
          </div>
        </div>

        {/* Orta Bölüm: Türkiye E-Ticaret Yasal Sözleşmeler ve Kurumsal Navigasyon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pb-space-lg border-b border-surface-container/60">
          {/* Sütun A: Sözleşmeler ve Yasal Haklar */}
          <div className="flex flex-col gap-2">
            <span className="font-label-sm uppercase font-bold text-primary tracking-wider flex items-center gap-1.5">
              <MaterialIcon name="gavel" className="text-base" />
              Yasal & Sözleşmeler
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-on-surface-variant mt-1">
              <li>
                <Link
                  href="/mesafeli-satis-sozlesmesi"
                  data-path="mesafeli-satis-sozlesmesi"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li>
                <Link
                  href="/on-bilgilendirme-formu"
                  data-path="on-bilgilendirme-formu"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Ön Bilgilendirme Formu
                </Link>
              </li>
              <li>
                <Link
                  href="/iptal-ve-iade"
                  data-path="iptal-ve-iade"
                  className="hover:text-primary transition-colors inline-block"
                >
                  İptal ve İade Koşulları
                </Link>
              </li>
              <li>
                <Link
                  href="/kullanim-kosullari"
                  data-path="kullanim-kosullari"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link
                  href="/teslimat-kosullari"
                  data-path="teslimat-kosullari"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Teslimat ve Sipariş Koşulları
                </Link>
              </li>
            </ul>
          </div>

          {/* Sütun B: Gizlilik, KVKK ve Kişisel Veriler */}
          <div className="flex flex-col gap-2">
            <span className="font-label-sm uppercase font-bold text-primary tracking-wider flex items-center gap-1.5">
              <MaterialIcon name="shield" className="text-base" />
              Gizlilik & KVKK
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-on-surface-variant mt-1">
              <li>
                <Link
                  href="/kvkk"
                  data-path="kvkk"
                  className="hover:text-primary transition-colors inline-block"
                >
                  KVKK Aydınlatma Metni
                </Link>
              </li>
              <li>
                <Link
                  href="/gizlilik"
                  data-path="gizlilik"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Gizlilik ve Güvenlik Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/cerez-politikasi"
                  data-path="cerez-politikasi"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Çerez Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/hesap-silme"
                  data-path="hesap-silme"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Hesap ve Veri Silme
                </Link>
              </li>
              <li>
                <Link
                  href="/legal"
                  data-path="legal"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Yasal Bilgi ve Alerjen Merkezi
                </Link>
              </li>
            </ul>
          </div>

          {/* Sütun C: Kurumsal, Künye ve Güvenli Ödeme */}
          <div className="flex flex-col gap-2">
            <span className="font-label-sm uppercase font-bold text-primary tracking-wider flex items-center gap-1.5">
              <MaterialIcon name="storefront" className="text-base" />
              Kurumsal & İletişim
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-on-surface-variant mt-1">
              <li>
                <Link
                  href="/kunye"
                  data-path="kunye"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Şirket Bilgileri & Künye
                </Link>
              </li>
              <li>
                <Link
                  href="/branches"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Şubelerimiz ve Adresler
                </Link>
              </li>
              <li>
                <Link
                  href="/account/support"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Canlı Destek & Müşteri Şikayet
                </Link>
              </li>
              <li className="text-xs text-on-surface-variant/80 mt-1">
                Müşteri Hizmetleri: <strong className="text-on-surface">0850 308 00 00</strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Rozetler ve Ödeme Güvenliği Şeridi */}
        <div className="flex flex-wrap items-center justify-between gap-space-md py-space-sm px-space-md bg-surface-container-low rounded-xl border border-surface-container text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <MaterialIcon name="verified_user" className="text-secondary-container text-lg" />
            <span className="font-semibold text-on-surface">iyzico Güvenli Ödeme</span>
            <span className="text-on-surface-variant/60 hidden sm:inline">•</span>
            <span className="hidden sm:inline">Kart bilgileri sunucularımızda saklanmaz</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MaterialIcon name="lock" className="text-sm text-primary" />
              <span>256-Bit SSL</span>
            </div>
            <div className="flex items-center gap-1">
              <MaterialIcon name="security" className="text-sm text-primary" />
              <span>3D Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <MaterialIcon name="health_and_safety" className="text-sm text-secondary-container" />
              <span>Gıda Güvenliği</span>
            </div>
          </div>
        </div>

        {/* Alt Çubuk (Copyright & Bar Links) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md font-body-sm text-body-sm text-on-surface-variant">
          <p>
            © {year} {BRAND_NAME}. Tüm hakları saklıdır.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-label-sm text-[11px] uppercase">
            <Link href="/mesafeli-satis-sozlesmesi" data-path="mesafeli-satis" className="hover:text-on-surface transition-colors">
              Mesafeli Satış
            </Link>
            <Link href="/on-bilgilendirme-formu" data-path="on-bilgilendirme" className="hover:text-on-surface transition-colors">
              Ön Bilgilendirme
            </Link>
            <Link href="/iptal-ve-iade" data-path="iptal-iade" className="hover:text-on-surface transition-colors">
              İptal & İade
            </Link>
            <Link href="/kvkk" data-path="kvkk" className="hover:text-on-surface transition-colors">
              KVKK
            </Link>
            <Link href="/gizlilik" data-path="gizlilik" className="hover:text-on-surface transition-colors">
              Gizlilik
            </Link>
            <Link href="/cerez-politikasi" data-path="cerez-politikasi" className="hover:text-on-surface transition-colors">
              Çerezler
            </Link>
            <Link href="/kunye" data-path="kunye" className="hover:text-on-surface transition-colors">
              Künye
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
