import localFont from 'next/font/local';
import Script from 'next/script';
import type { ReactNode } from 'react';

// `@fastfood/ui-web/styles.css` kaldirildi (ADR-019). Bu paket emekli tasarim
// sistemidir ve global yuklenerek tum admin sayfalarina 335 `ff-*` kurali ile
// 136 eski token enjekte ediyordu; 32 tanesi admin'in kendi token adiyla
// cakisiyordu. Hiçbir admin yuzeyi artik onun sinifini kullanmiyor.
import { AdminShell } from '../components/admin-shell';
import './globals.css';
import '../styles/admin-stitch-tokens.css';
import '../styles/admin-fastfood-tokens.css';
import '../styles/admin-ops.css';
import '../styles/admin-sidebar.css';

/**
 * Self-hosted fonts (audit P2-7 / A9).
 *
 * Previously loaded through `next/font/google`, which downloads the binaries
 * from `fonts.googleapis.com` at build time and therefore made the build
 * non-hermetic. The runtime stylesheet link to `fonts.googleapis.com` also
 * leaked visitor IPs to Google. The binaries live in
 * `@fastfood/design-tokens/fonts` and are subset to Latin + Latin-Extended-A
 * (Turkish ğ/ş/İ/ı included).
 */
const anton = localFont({
  src: '../../../../packages/design-tokens/fonts/anton-400.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-anton',
  fallback: ['Anton', 'ui-sans-serif', 'sans-serif'],
});

const inter = localFont({
  src: '../../../../packages/design-tokens/fonts/inter-var.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['Inter', 'ui-sans-serif', 'sans-serif'],
});

const jetbrains = localFont({
  src: '../../../../packages/design-tokens/fonts/jetbrains-mono-var.woff2',
  weight: '100 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-jetbrains',
  fallback: ['JetBrains Mono', 'ui-monospace', 'monospace'],
});

const plusJakarta = localFont({
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
  title: 'FASTFOOD Admin',
  description: 'Şube ve merkez operasyon paneli.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="tr"
      data-theme="operations"
      data-color-mode="dark"
      className={`${anton.variable} ${inter.variable} ${jetbrains.variable} ${plusJakarta.variable} ${materialSymbols.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="admin-color-mode-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "try{const mode=window.localStorage.getItem('fastfood-admin-color-mode');if(mode==='light'||mode==='dark'){document.documentElement.dataset.colorMode=mode;document.documentElement.style.colorScheme=mode}}catch{}",
          }}
        />
      </head>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
