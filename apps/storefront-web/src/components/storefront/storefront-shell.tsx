'use client';

import type { ReactNode } from 'react';

import { DiningContextBanner } from './dining-context-banner';
import { FavoritesProvider } from './favorites-provider';
import { ScrollToTopButton } from './scroll-to-top';
import { StorefrontChromeProvider, useStorefrontChrome } from './storefront-chrome';
import { StorefrontFooter } from './storefront-footer';
import { StorefrontHeader } from './storefront-header';

function ShellFrame({ children }: { children: ReactNode }) {
  const { home, status, cartCount, setQuery, query, setBranchId } = useStorefrontChrome();
  return (
    <>
      <a href="#storefront-main" className="ff-skip-link">
        İçeriğe geç
      </a>
      <StorefrontHeader
        home={home}
        cartCount={cartCount}
        onSearch={setQuery}
        searchValue={query}
        onSelectBranch={setBranchId}
      />
      <DiningContextBanner />
      <div id="storefront-main">{children}</div>
      <ScrollToTopButton />
      <StorefrontFooter home={home} homeStatus={status} />
    </>
  );
}

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <FavoritesProvider>
      <StorefrontChromeProvider>
        <ShellFrame>{children}</ShellFrame>
      </StorefrontChromeProvider>
    </FavoritesProvider>
  );
}