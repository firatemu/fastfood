'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession } from './session-provider';

const links = [['/deliveries', '⌁', 'Seferler'], ['/claim', '⌗', 'QR ile al'], ['/history', '↗', 'Geçmiş'], ['/performance', '◷', 'Performans']] as const;
export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const session = useSession();
  return <div className="app-frame"><aside className="rail"><Link href="/deliveries" className="brand-mark">f<span>.</span></Link><div className="rail-label">KURYE</div><nav>{links.map(([href, icon, label]) => <Link key={href} className={`rail-link ${path.startsWith(href) ? 'active' : ''}`} href={href}><span className="rail-icon">{icon}</span><span>{label}</span></Link>)}</nav><div className="rail-bottom"><span className="online-dot"/><span>Çevrimiçi</span><button onClick={() => void session.signOut()} aria-label="Oturumu kapat" title="Oturumu kapat">↗</button></div></aside><main className="main-area"><header className="topbar"><div><span className="eyebrow">FASTFOOD · KURYE OPERASYONLARI</span><span className="topbar-title">Teslimat merkezi</span></div><div className="topbar-right"><span className="secure-pill"><i/> Güvenli oturum</span><span className="avatar">{session.userId?.slice(0, 2).toUpperCase() ?? 'KR'}</span></div></header><div className="page-content">{children}</div></main></div>;
}
