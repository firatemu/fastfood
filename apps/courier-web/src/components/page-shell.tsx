'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppFrame } from './app-frame';

export function PageShell({ children }: { children: ReactNode }) {
  return usePathname() === '/login' ? <>{children}</> : <AppFrame>{children}</AppFrame>;
}
