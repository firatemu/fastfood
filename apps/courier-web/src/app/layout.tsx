import type { Metadata, Viewport } from 'next';

import { Guard } from '../components/guard';
import { PageShell } from '../components/page-shell';
import { SessionProvider } from '../components/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kurye Merkezi · FASTFOOD',
  description: 'FASTFOOD kurye teslimat, şube havuzu, QR teslim alma ve performans yönetimi',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-theme="operations">
      <body>
        <SessionProvider>
          <Guard>
            <PageShell>{children}</PageShell>
          </Guard>
        </SessionProvider>
      </body>
    </html>
  );
}
