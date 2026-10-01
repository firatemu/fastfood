'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { ADMIN_NAV_SECTIONS, isNavActive } from '../../lib/admin-nav';

import { NAV_ICON, OpsIcon } from './ops-icon';

export type OpsTab = {
  href: string;
  label: string;
  icon: string;
};

type OpsTabsProps = {
  tabs: OpsTab[];
  activeHref: string;
  onSelect: (href: string) => void;
  onClose: (href: string) => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onCloseAll: () => void;
  onRefresh: () => void;
};

export function navIconForPath(pathname: string): string {
  for (const section of ADMIN_NAV_SECTIONS) {
    const item = section.items.find((candidate) => isNavActive(pathname, candidate));
    if (item) return NAV_ICON[item.id] ?? 'circle';
  }
  return 'circle';
}

export function OpsTabs({
  tabs,
  activeHref,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onRefresh,
}: OpsTabsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const activeIndex = tabs.findIndex((tab) => tab.href === activeHref);
  const hasOtherTabs = tabs.length > 1;
  const hasTabsToRight = activeIndex >= 0 && activeIndex < tabs.length - 1;

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'w') {
        event.preventDefault();
        onClose(activeHref);
        return;
      }
      if (event.key !== 'Tab' || tabs.length < 2) return;
      event.preventDefault();
      const nextIndex = (activeIndex + (event.shiftKey ? -1 : 1) + tabs.length) % tabs.length;
      onSelect(tabs[nextIndex]?.href ?? activeHref);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [activeHref, activeIndex, menuOpen, onClose, onSelect, tabs]);

  function moveWithArrow(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!tabs.length || activeIndex < 0) return;
    let nextIndex = activeIndex;
    if (event.key === 'ArrowRight') nextIndex = (activeIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === activeIndex) return;
    event.preventDefault();
    onSelect(tabs[nextIndex]?.href ?? activeHref);
  }

  return (
    <div className="ops-tabbar" aria-label="Açık sayfalar">
      <div className="ops-tabs" role="tablist" aria-label="Açık sayfalar">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <div
              key={tab.href}
              className={active ? 'ops-tab ops-tab--active' : 'ops-tab'}
              role="presentation"
            >
              <button
                type="button"
                className="ops-tab__select"
                role="tab"
                aria-selected={active}
                aria-controls="admin-main"
                onKeyDown={moveWithArrow}
                onClick={() => onSelect(tab.href)}
              >
                <OpsIcon name={tab.icon} />
                <span className="ops-tab__label">{tab.label}</span>
              </button>
              <button
                type="button"
                className="ops-tab__close"
                aria-label={`${tab.label} sekmesini kapat`}
                title="Sekmeyi kapat"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.href);
                }}
              >
                <OpsIcon name="close" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="ops-tabbar__actions">
        <button
          type="button"
          className="ops-tabbar__action"
          onClick={onRefresh}
          aria-label="Aktif sayfayı yenile"
          title="Aktif sayfayı yenile"
        >
          <OpsIcon name="refresh" />
        </button>
        <div className="ops-tabbar__menu-wrap">
          <button
            type="button"
            className="ops-tabbar__action"
            aria-label="Sekme işlemleri"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="Sekme işlemleri"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <OpsIcon name="more_horiz" />
          </button>
          {menuOpen && (
            <div className="ops-tabbar__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={!hasOtherTabs}
                onClick={() => {
                  onCloseOthers();
                  setMenuOpen(false);
                }}
              >
                <OpsIcon name="tab_close" /> Diğer sekmeleri kapat
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!hasTabsToRight}
                onClick={() => {
                  onCloseToRight();
                  setMenuOpen(false);
                }}
              >
                <OpsIcon name="last_page" /> Sağdaki sekmeleri kapat
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!hasOtherTabs}
                onClick={() => {
                  onCloseAll();
                  setMenuOpen(false);
                }}
              >
                <OpsIcon name="clear_all" /> Tüm sekmeleri kapat
              </button>
              <span className="ops-tabbar__menu-divider" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  router.push('/');
                  setMenuOpen(false);
                }}
              >
                <OpsIcon name="home" /> Genel bakışa git
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
