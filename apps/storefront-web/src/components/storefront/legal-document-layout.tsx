'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { MaterialIcon } from './material-icon';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

const LEGAL_QUICK_LINKS = [
  { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
  { href: '/on-bilgilendirme-formu', label: 'Ön Bilgilendirme Formu' },
  { href: '/iptal-ve-iade', label: 'İptal ve İade Koşulları' },
  { href: '/kvkk', label: 'KVKK Aydınlatma Metni' },
  { href: '/gizlilik', label: 'Gizlilik ve Güvenlik' },
  { href: '/cerez-politikasi', label: 'Çerez Politikası' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
  { href: '/teslimat-kosullari', label: 'Teslimat Koşulları' },
  { href: '/kunye', label: 'Künye ve Şirket Bilgileri' },
] as const;

export function LegalDocumentLayout({
  title,
  subtitle = 'Yasal Bilgilendirme',
  lastUpdated,
  surfaceId,
  currentPath,
  sections,
  children,
}: {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  surfaceId: string;
  currentPath?: string;
  sections?: LegalSection[];
  children?: ReactNode;
}) {
  return (
    <main
      className="w-full pt-20 bg-background min-h-screen"
      data-ff-surface={surfaceId}
    >
      <div className="max-w-5xl mx-auto px-margin-sm lg:px-margin py-space-lg flex flex-col gap-space-xl">
        {/* Breadcrumb & Header */}
        <div className="border-b border-surface-container-high pb-space-lg">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-sm uppercase mb-2">
            <Link href="/" className="hover:text-primary transition-colors">
              Ana Sayfa
            </Link>
            <MaterialIcon name="chevron_right" className="text-sm" />
            <Link href="/legal" className="hover:text-primary transition-colors">
              Yasal
            </Link>
            <MaterialIcon name="chevron_right" className="text-sm" />
            <span className="text-primary-container">{subtitle}</span>
          </div>

          <h1 className="font-headline-lg uppercase text-on-surface mt-2 tracking-wide">
            {title}
          </h1>

          {lastUpdated ? (
            <div className="flex items-center gap-2 mt-2 text-on-surface-variant font-body-sm">
              <MaterialIcon name="schedule" className="text-sm text-secondary-container" />
              <span>Son Güncelleme: {lastUpdated}</span>
            </div>
          ) : null}
        </div>

        {/* Quick Link Navigation Strip */}
        <div className="bg-surface-container-lowest p-space-sm rounded-xl border border-surface-container overflow-x-auto">
          <p className="font-label-sm uppercase text-on-surface-variant px-2 py-1 text-[11px]">
            Hızlı Yasal Menü:
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {LEGAL_QUICK_LINKS.map((link) => {
              const active = currentPath === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg font-label-sm text-xs transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-secondary-container text-on-secondary-container font-bold'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
          {sections && sections.length > 0 ? (
            <aside className="lg:col-span-4 hidden lg:block">
              <div className="sticky top-28 bg-surface-container-low p-space-md rounded-xl border border-surface-container flex flex-col gap-2">
                <span className="font-label-sm uppercase text-on-surface font-bold tracking-wider mb-1">
                  İçindekiler
                </span>
                <nav className="flex flex-col gap-1.5 font-body-sm">
                  {sections.map((sec, index) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="text-on-surface-variant hover:text-primary transition-colors py-1 line-clamp-1"
                    >
                      {index + 1}. {sec.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          ) : null}

          <div
            className={`${
              sections && sections.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'
            } flex flex-col gap-space-lg text-on-surface`}
          >
            {sections
              ? sections.map((sec, index) => (
                  <article
                    key={sec.id}
                    id={sec.id}
                    className="scroll-mt-28 p-space-md lg:p-space-lg rounded-xl bg-surface-container-low border border-surface-container/60 shadow-sm"
                  >
                    <h2 className="font-headline-sm uppercase text-on-surface mb-space-sm flex items-center gap-2">
                      <span className="text-secondary-container text-sm font-label-sm">
                        {String(index + 1).padStart(2, '0')}.
                      </span>
                      {sec.title}
                    </h2>
                    <div className="font-body-md text-on-surface-variant space-y-3 leading-relaxed">
                      {sec.content}
                    </div>
                  </article>
                ))
              : children}
          </div>
        </div>
      </div>
    </main>
  );
}
