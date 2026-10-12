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
  homeStatus?: 'loading' | 'ready' | 'error';
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
    <footer className="w-full bg-surface-container-lowest">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xl pb-space-xl">
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
                href="/legal#sirket"
                className="p-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                aria-label="İletişim"
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
                  href="/legal#alerjen-rehberi"
                  data-path="alerjen-rehberi"
                  className="text-on-surface-variant hover:text-on-surface transition-colors underline decoration-outline-variant"
                >
                  Şeffaf Alerjen ve Besin Rehberi
                </Link>
              </li>
            </ul>
          </div>
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
        <div className="pt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md font-body-sm text-body-sm text-on-surface-variant">
          <p>
            © {year} {BRAND_NAME}. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-space-lg font-label-sm text-label-sm uppercase">
            <Link href="/gizlilik" data-path="gizlilik" className="hover:text-on-surface transition-colors">
              Gizlilik
            </Link>
            <Link href="/hesap-silme" data-path="hesap-silme" className="hover:text-on-surface transition-colors">
              Hesap Silme
            </Link>
            <Link href="/legal#kullanim-kosullari" data-path="kullanim-kosullari" className="hover:text-on-surface transition-colors">
              Kullanım Koşulları
            </Link>
            <Link href="/legal#kvkk" data-path="kvkk" className="hover:text-on-surface transition-colors">
              KVKK Aydınlatma
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
