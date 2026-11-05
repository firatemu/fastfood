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
      ? 'Yakınlık sıralaması için "Yakınımdakini Bul" butonuna basarak konum izni verin.'
      : null);

  return (
    <main className="min-h-screen w-full bg-[#0a0c14] text-neutral-100 pt-20" data-ff-surface="branches">
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

      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#12151f]/80 backdrop-blur-xl p-8 sm:p-12 shadow-xl max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <MaterialIcon name="search_off" className="text-3xl" />
            </div>
            <h3 className="font-anton text-2xl uppercase text-white tracking-wide">
              Eşleşen Şube Bulunamadı
            </h3>
            <p className="font-sans text-sm text-neutral-400 leading-relaxed max-w-md">
              Arama ifadenizi kısaltabilir, seçili şehir filtresini &apos;Tümü&apos; olarak değiştirebilir veya filtreleri sıfırlayabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => patch({ ...DEFAULT_FINDER })}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 text-neutral-950 px-5 py-2.5 font-anton text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(254,179,0,0.3)] transition-all"
            >
              <MaterialIcon name="restart_alt" className="text-base" />
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
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
