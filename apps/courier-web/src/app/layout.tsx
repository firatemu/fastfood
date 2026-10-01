import type { Metadata } from 'next';

import { Guard } from '../components/guard';
import { PageShell } from '../components/page-shell';
import { SessionProvider } from '../components/session-provider';
import './globals.css';
export const metadata: Metadata = { title: 'Kurye Merkezi · FASTFOOD', description: 'FASTFOOD kurye teslimat ve sefer yönetimi' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="tr" data-theme="operations"><body><SessionProvider><Guard><PageShell>{children}</PageShell></Guard></SessionProvider></body></html>; }
