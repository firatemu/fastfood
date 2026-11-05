import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import './globals.css';

/**
 * Self-hosted fonts (audit P2-7 / A9).
 *
 * These were previously loaded through `next/font/google`, which downloads the
 * binaries from `fonts.googleapis.com` at build time. That made the build
 * non-hermetic (a CI runner or Docker build without egress cannot produce an
 * artifact) and the runtime stylesheet link leaked visitor IPs to Google,
 * which conflicts with the KVKK posture in document 18.
 *
 * The binaries live in `@fastfood/design-tokens/fonts` (the single source of
 * truth for visual values, document 38) and are subset to Latin +
 * Latin-Extended-A, which covers the Turkish letters ğ/ş/İ/ı.
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

const materialSymbols = localFont({
  src: '../../../../packages/design-tokens/fonts/material-symbols-400.ttf',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-material-symbols',
  fallback: ['Material Symbols Outlined', 'sans-serif'],
});

export const metadata = {
  title: 'BURGER HOME',
  description: 'BURGER HOME müşteri Storefront — canlı menü ve sipariş.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="tr"
      className={`dark ${anton.variable} ${jakarta.variable} ${materialSymbols.variable}`}
    >
      <body className="bg-background text-on-surface antialiased">{children}</body>
    </html>
  );
}
