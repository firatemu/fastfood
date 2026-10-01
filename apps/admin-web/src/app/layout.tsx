import { Anton, Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';

import '@fastfood/ui-web/styles.css';

import { AdminShell } from '../components/admin-shell';
import './globals.css';
import '../styles/admin-stitch-tokens.css';
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
      className={`${anton.variable} ${inter.variable} ${jetbrains.variable}`}
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
