import type { ReactNode } from 'react';

import './styles.css';

export interface AppShellNavItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  active?: boolean;
  onSelect?: () => void;
}

export interface AppShellNavSection {
  id: string;
  label: string;
  items: AppShellNavItem[];
}

export interface AppShellProps {
  brand: ReactNode;
  /** Flat nav (legacy / simple demos). Ignored when `navSections` is provided. */
  navItems?: AppShellNavItem[];
  /** Grouped sidebar sections for Admin IA. */
  navSections?: AppShellNavSection[];
  /** Optional top utility strip (search, user menu). */
  topbar?: ReactNode;
  /** Optional footer in the sidebar. */
  sidebarFooter?: ReactNode;
  children: ReactNode;
  /** Accessible landmark label for the primary content. */
  contentLabel?: string;
  className?: string;
}

function NavItemButton(item: AppShellNavItem) {
  const classes = ['ff-app-shell__nav-item', item.active ? 'ff-app-shell__nav-item--active' : '']
    .filter(Boolean)
    .join(' ');
  if (item.href) {
    return (
      <a
        key={item.id}
        href={item.href}
        className={classes}
        aria-current={item.active ? 'page' : undefined}
      >
        {item.icon ? (
          <span className="ff-app-shell__nav-icon" aria-hidden="true">
            {item.icon}
          </span>
        ) : null}
        <span>{item.label}</span>
      </a>
    );
  }
  return (
    <button
      key={item.id}
      type="button"
      className={classes}
      aria-current={item.active ? 'page' : undefined}
      onClick={item.onSelect}
    >
      {item.icon ? (
        <span className="ff-app-shell__nav-icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span>{item.label}</span>
    </button>
  );
}

/**
 * AppShell — production Operations chrome pattern (sidebar + topbar + content).
 * The Admin OpsShell consumes this; Admin full visual rollout is separately authorized.
 */
export function AppShell(props: AppShellProps) {
  const {
    brand,
    navItems = [],
    navSections,
    topbar,
    sidebarFooter,
    children,
    contentLabel = 'İçerik',
    className,
  } = props;

  return (
    <div className={['ff-app-shell', className ?? ''].filter(Boolean).join(' ')}>
      <aside className="ff-app-shell__aside" aria-label="Uygulama menüsü">
        <div className="ff-app-shell__brand">{brand}</div>
        <nav className="ff-app-shell__nav" aria-label="Birincil navigasyon">
          {navSections && navSections.length > 0
            ? navSections.map((section) => (
                <div key={section.id} className="ff-app-shell__nav-section">
                  <p className="ff-app-shell__nav-section-label">{section.label}</p>
                  <div
                    className="ff-app-shell__nav-section-items"
                    role="group"
                    aria-label={section.label}
                  >
                    {section.items.map((item) => NavItemButton(item))}
                  </div>
                </div>
              ))
            : navItems.map((item) => NavItemButton(item))}
        </nav>
        {sidebarFooter ? <div className="ff-app-shell__aside-footer">{sidebarFooter}</div> : null}
      </aside>
      <div className="ff-app-shell__main">
        {topbar ? (
          <header className="ff-app-shell__topbar" aria-label="Üst çubuk">
            {topbar}
          </header>
        ) : null}
        <main className="ff-app-shell__content" aria-label={contentLabel}>
          {children}
        </main>
      </div>
    </div>
  );
}
