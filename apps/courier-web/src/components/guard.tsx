'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from './session-provider';
export function Guard({ children }: { children: React.ReactNode }) { const s = useSession(); const path = usePathname(); const router = useRouter(); useEffect(() => { if (s.ready && !s.signedIn && path !== '/login') router.replace('/login'); if (s.ready && s.signedIn && path === '/login') router.replace('/deliveries'); }, [s.ready, s.signedIn, path, router]); if (!s.ready || (!s.signedIn && path !== '/login')) return <div className="boot-screen"><span className="loader"/> Kurye alanı hazırlanıyor</div>; return <>{children}</>; }
