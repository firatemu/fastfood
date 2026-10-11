import { Anton, Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
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

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
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
      className={`${anton.variable} ${inter.variable} ${jetbrains.variable} ${plusJakarta.variable}`}
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
