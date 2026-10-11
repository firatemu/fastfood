'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { breadcrumbsForPath } from '../../lib/admin-nav';

/**
 * Sayfa kimligi basligi — ADR-019 Navy dilinde paylasilan ilkel.
 *
 * Crumb kanonik IA'dan turetilir (`breadcrumbsForPath`), sayfa basligi ve
 * lede ise backend sozlesmesinden yazilir. Onceki surumde sayfanin ilk
 * gorunen satiri gelistirici notuydu (`BRANCH_SCOPED`, uc listesi, "detay uc
 * yok"); bu not artik arayuz metni degil.
 *
 * `scope`, operasyonel kapsami tek etikette gosterir (or. secili sube).
 * `actions`, basligin sag tarafindaki gercek kontroller icindir.
 */
export function OpsPageHeader(props: {
  title: ReactNode;
  lede?: ReactNode;
  scope?: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const crumbs = breadcrumbsForPath(pathname);
  const section = crumbs.length >= 2 ? crumbs[crumbs.length - 2]?.label : undefined;
  const current = crumbs[crumbs.length - 1]?.label;

  const hasAside = props.scope != null || props.actions != null;

  return (
    <>
      <header className="ops-page__hero">
        <div className="ops-page__hero-meta">
          {section && current ? (
            <div className="ops-page__crumb">
              {section} <span>/</span> {current}
            </div>
          ) : null}
          <h1 className="ops-page__hero-title">{props.title}</h1>
        </div>
        {hasAside ? (
          <div className="ops-page__hero-actions">
            {props.scope != null ? <span className="ops-scope-tag">{props.scope}</span> : null}
            {props.actions}
          </div>
        ) : null}
      </header>
      {props.lede != null ? <p className="ops-page__lede">{props.lede}</p> : null}
    </>
  );
}
