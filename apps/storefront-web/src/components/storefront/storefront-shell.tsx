'use client';

import type { ReactNode } from 'react';

import { DiningContextBanner } from './dining-context-banner';
import { StorefrontChromeProvider, useStorefrontChrome } from './storefront-chrome';
import { StorefrontFooter } from './storefront-footer';
import { StorefrontHeader } from './storefront-header';

function ShellFrame({ children }: { children: ReactNode }) {
  const { home, status, cartCount, setQuery, query } = useStorefrontChrome();
  return (
    <>
      <a href="#storefront-main" className="ff-skip-link">
        İçeriğe geç
      </a>
      <StorefrontHeader home={home} cartCount={cartCount} onSearch={setQuery} searchValue={query} />
      <DiningContextBanner />
      <div id="storefront-main">{children}</div>
      <StorefrontFooter home={home} homeStatus={status} />
    </>
  );
}

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <StorefrontChromeProvider>
      <ShellFrame>{children}</ShellFrame>
    </StorefrontChromeProvider>
  );
}
