import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import './globals.css';

/**
 * Self-hosted fonts (audit P2-7 / A9).
 *
 * Previously loaded through `next/font/google`, which downloads the binaries
 * from `fonts.googleapis.com` at build time and therefore made the build
 * non-hermetic. The binaries live in `@fastfood/design-tokens/fonts` and are
 * subset to Latin + Latin-Extended-A (Turkish ğ/ş/İ/ı included).
 */
const anton = localFont({
  src: '../../../../packages/design-tokens/fonts/anton-400.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-anton',
  fallback: ['Anton', 'ui-sans-serif', 'sans-serif'],
});

const jakarta = localFont({
  src: '../../../../packages/design-tokens/fonts/plus-jakarta-sans-var.woff2',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-jakarta',
  fallback: ['Plus Jakarta Sans', 'ui-sans-serif', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'BURGER HOME · QR Menü',
  description: 'BURGER HOME QR Menü — ürünler, porsiyonlar ve ekstra tercihleri.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${anton.variable} ${jakarta.variable}`}>
      <body className="bg-paper font-body text-ink antialiased">{children}</body>
    </html>
  );
}
