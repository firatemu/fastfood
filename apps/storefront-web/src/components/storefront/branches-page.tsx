'use client';

import { useMemo, useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import {
  fetchContentBySlug,
  fetchCustomerBranches,
  type CustomerBranch,
  type StorefrontContent,
} from '../../lib/storefront/discover';
import { groupOperatingHours } from '../../lib/storefront/hours';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { BranchCard, type BranchCardData } from './branches/branch-card';
import { BranchHero } from './branches/branch-hero';
import { BranchStory, ContactCta } from './branches/branch-story';
import { CityFilter, type CityOption } from './branches/city-filter';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

const CITY_ORDER = ['ADANA', 'OSMANİYE', 'GAZİANTEP', 'MERSİN', 'İSTANBUL'] as const;

function branchCity(branch: CustomerBranch): string {
  const m = branch.addressLine.match(/\/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*$/);
  if (!m || !m[1]) return '';
  return m[1].toUpperCase();
}

function toCardData(branch: CustomerBranch, city: string): BranchCardData {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    city,
    addressLine: branch.addressLine,
    phone: branch.phone ?? null,
    latitude: branch.latitude,
    longitude: branch.longitude,
    isAcceptingOrders: branch.isAcceptingOrders,
    deliveryEnabled: branch.deliveryEnabled !== false,
    pickupEnabled: branch.pickupEnabled !== false,
    estimatedDeliveryMinutesMin: branch.estimatedDeliveryMinutesMin,
    estimatedDeliveryMinutesMax: branch.estimatedDeliveryMinutesMax,
    hours: groupOperatingHours(branch.hours ?? []),
  };
}

export function BranchesPage(): React.ReactElement {
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [story, setStory] = useState<StorefrontContent | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [activeCity, setActiveCity] = useState<string>('TÜMÜ');

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

  const grouped = useMemo(() => {
    const m = new Map<string, CustomerBranch[]>();
    for (const b of branches) {
      const c = branchCity(b) || 'DİĞER';
      const arr = m.get(c) ?? [];
      arr.push(b);
      m.set(c, arr);
    }
    return m;
  }, [branches]);

  const cityOptions: CityOption[] = useMemo(() => {
    const out: CityOption[] = [{ key: 'TÜMÜ', label: 'Tümü', count: branches.length }];
    for (const c of CITY_ORDER) {
      if (grouped.has(c)) {
        out.push({
          key: c,
          label: c.charAt(0) + c.slice(1).toLowerCase(),
          count: grouped.get(c)!.length,
        });
      }
    }
    return out;
  }, [grouped, branches.length]);

  const visibleCards = useMemo(() => {
    const list = activeCity === 'TÜMÜ' ? branches : grouped.get(activeCity) ?? [];
    return list.map((b) => toCardData(b, branchCity(b)));
  }, [activeCity, branches, grouped]);

  const cityCount = grouped.size;
  const openCount = branches.filter((b) => b.isActive && b.isAcceptingOrders).length;

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

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="branches">
      <BranchHero
        story={story}
        branchCount={branches.length}
        cityCount={cityCount}
        openCount={openCount}
      />

      <CityFilter
        options={cityOptions}
        active={activeCity}
        onSelect={setActiveCity}
      />

      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl flex flex-col gap-space-xl">
        {visibleCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container py-space-2xl text-center">
            <MaterialIcon name="search_off" className="text-4xl text-on-surface-variant" />
            <p className="font-headline-sm uppercase">Bu şehirde şube yok</p>
            <p className="font-body-md max-w-sm text-on-surface-variant">
              Şehir filtresini değiştirerek diğer şubeleri görüntüleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-space-md xl:grid-cols-2">
            {visibleCards.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        )}

        <BranchStory story={story} />
        <ContactCta />
      </div>
    </main>
  );
}
