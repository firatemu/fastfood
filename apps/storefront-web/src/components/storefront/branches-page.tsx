'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { deviceLocationMessage, getDeviceLocation } from '../../lib/device-location';
import { errorMessage } from '../../lib/load-state';
import {
  DEFAULT_FINDER,
  applyFinder,
  buildBranchViews,
  cityGroups,
  finderSearch,
  nearestBranchId,
  networkFacts,
  readFinderState,
  type Branch,
  type BranchPoint,
  type FinderState,
} from '../../lib/storefront/branch-finder';
import {
  fetchContentBySlug,
  fetchCustomerBranches,
  type StorefrontContent,
} from '../../lib/storefront/discover';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { BranchFinderBar } from './branches/branch-finder-bar';
import { BranchPass } from './branches/branch-pass';
import { BranchStory, ContactCta } from './branches/branch-story';
import { BranchTicket } from './branches/branch-ticket';
import { OrderFacts } from './branches/order-facts';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

const CLOCK_INTERVAL_MS = 60_000;

export function BranchesPage(): React.ReactElement {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [story, setStory] = useState<StorefrontContent | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [clock, setClock] = useState(() => new Date());
  const [origin, setOrigin] = useState<BranchPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [finder, setFinder] = useState<FinderState>(() =>
    typeof window === 'undefined' ? DEFAULT_FINDER : readFinderState(window.location.search),
  );

  useDeferredLoad(() => {
    void (async () => {
      try {
        const [list, hikaye] = await Promise.all([
          fetchCustomerBranches(),
          fetchContentBySlug('hikaye').catch(() => null),
        ]);
        setBranches(list);
        setStory(hikaye);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [nonce]);

  // Live countdowns need a ticking clock, not a value frozen at first render.
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Filters live in the URL so a filtered view survives reload and can be shared.
  useEffect(() => {
    const search = finderSearch(finder);
    if (window.location.search !== search) {
      window.history.replaceState(null, '', `${window.location.pathname}${search}`);
    }
  }, [finder]);

  const views = useMemo(() => buildBranchViews(branches, clock, origin), [branches, clock, origin]);
  const visible = useMemo(() => applyFinder(views, finder), [views, finder]);
  const facts = useMemo(() => networkFacts(views), [views]);
  const cities = useMemo(() => cityGroups(branches), [branches]);
  const sharedEta = useMemo(() => views.find((view) => view.eta)?.eta ?? null, [views]);
  const nearestId = useMemo(() => nearestBranchId(views), [views]);

  useEffect(() => {
    if (!finder.focusId) return;
    document.getElementById(`branch-${finder.focusId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [finder.focusId, visible.length]);

  const patch = useCallback((next: Partial<FinderState>) => {
    setFinder((current) => ({ ...current, ...next }));
  }, []);

  async function locateNearest() {
    if (locating) return;
    setLocating(true);
    setLocationError(null);
    try {
      const point = await getDeviceLocation();
      setOrigin(point);
      patch({ sort: 'distance' });
    } catch (err) {
      setLocationError(deviceLocationMessage(err));
    } finally {
      setLocating(false);
    }
  }

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return (
      <ShopError
        title="Şubeler"
        message={error ?? 'Yüklenemedi.'}
        onRetry={() => setNonce((n) => n + 1)}
      />
    );
  }

  const hint =
    locationError ??
    (finder.sort === 'distance' && !origin
      ? 'Yakınlık sıralaması için Yakınımdakini bul düğmesini kullan.'
      : null);

  return (
    <main className="min-h-screen w-full bg-background pt-20" data-ff-surface="branches">
      <BranchPass
        views={views}
        facts={facts}
        focusId={finder.focusId}
        located={origin !== null}
        onPick={(id) => patch({ focusId: id })}
      />

      <BranchFinderBar
        cities={cities}
        city={finder.city}
        query={finder.q}
        onQuery={(q) => patch({ q })}
        onCity={(city) => patch({ city, focusId: null })}
        openOnly={finder.openOnly}
        onOpenOnly={(openOnly) => patch({ openOnly })}
        deliveryOnly={finder.deliveryOnly}
        onDeliveryOnly={(deliveryOnly) => patch({ deliveryOnly })}
        pickupOnly={finder.pickupOnly}
        onPickupOnly={(pickupOnly) => patch({ pickupOnly })}
        sort={finder.sort}
        onSort={(sort) => patch({ sort })}
        locating={locating}
        located={origin !== null}
        onLocate={() => void locateNearest()}
        total={views.length}
        shown={visible.length}
        hint={hint}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-space-lg px-margin-sm py-space-xl lg:px-margin">
        {visible.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container/40 p-space-lg">
            <MaterialIcon name="search_off" className="text-4xl text-on-surface-variant" />
            <p className="font-headline-sm text-headline-sm uppercase text-on-surface">
              Bu filtrelerde şube yok
            </p>
            <p className="max-w-sm font-body-md text-on-surface-variant">
              Aramayı kısalt, şehir filtresini temizle ya da şu an açık seçimini kaldır.
            </p>
            <button
              type="button"
              onClick={() => patch({ ...DEFAULT_FINDER })}
              className="rounded-xl border border-outline-variant/40 px-4 py-2.5 font-label-md uppercase tracking-[0.08em] text-on-surface transition-colors hover:border-secondary-container/50 hover:text-secondary-container"
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
            {visible.map((branch) => (
              <BranchTicket
                key={branch.id}
                branch={branch}
                nearest={origin !== null && branch.id === nearestId}
                focused={finder.focusId === branch.id}
                located={origin !== null}
              />
            ))}
          </div>
        )}

        <OrderFacts facts={facts} eta={sharedEta} />
        <BranchStory story={story} />
        <ContactCta />
      </div>
    </main>
  );
}
