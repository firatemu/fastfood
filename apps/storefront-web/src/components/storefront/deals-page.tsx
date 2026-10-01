'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { addComboItemsToCart } from '../../lib/storefront/cart';
import { fetchPublicDeals, type PublicDeal } from '../../lib/storefront/discover';
import { type StorefrontHome } from '../../lib/storefront/home';
import { setStoredCouponCode } from '../../lib/storefront/promotions';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';
import { useStorefrontChrome } from './storefront-chrome';

type DealFilter = 'all' | 'combo' | 'cart' | 'takeaway';
type HomeCombo = NonNullable<StorefrontHome['combo']>;

function formatHms(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function percentFromBps(bps: number | null | undefined): number | null {
  if (bps == null) return null;
  return bps % 100 === 0 ? bps / 100 : Number((bps / 100).toFixed(1));
}

function dealBucket(kind: string): Exclude<DealFilter, 'all' | 'combo'> {
  return kind === 'DELIVERY_FEE_WAIVER' ? 'takeaway' : 'cart';
}

function dealKindLabel(kind: string): string {
  switch (kind) {
    case 'PERCENT_CART':
      return 'Sepet İndirimi';
    case 'FIXED_CART_MINOR':
      return 'Sepet Kuponu';
    case 'DELIVERY_FEE_WAIVER':
      return 'Teslimat Avantajı';
    default:
      return 'Kampanya';
  }
}

function dealKindIcon(kind: string): string {
  switch (kind) {
    case 'PERCENT_CART':
      return 'percent';
    case 'FIXED_CART_MINOR':
      return 'loyalty';
    case 'DELIVERY_FEE_WAIVER':
      return 'moped';
    default:
      return 'local_offer';
  }
}

function dealValue(deal: PublicDeal): { kicker: string; value: string } {
  const pct = percentFromBps(deal.discountPercentBps);
  const min = BigInt(deal.minMerchandiseMinor) > 0n;
  if (deal.kind === 'PERCENT_CART' && pct != null) {
    return {
      kicker: min ? `Alt Limit: ${formatTryMinor(deal.minMerchandiseMinor, 'TRY')}` : 'Tüm Menülerde',
      value: `%${pct} İNDİRİM`,
    };
  }
  if (deal.kind === 'FIXED_CART_MINOR' && deal.discountMinor) {
    return {
      kicker: min ? `Alt Limit: ${formatTryMinor(deal.minMerchandiseMinor, 'TRY')}` : 'Sepette anında',
      value: `−${formatTryMinor(deal.discountMinor, 'TRY')} NET`,
    };
  }
  if (deal.kind === 'DELIVERY_FEE_WAIVER') {
    return { kicker: 'Teslimatta', value: 'ÜCRETSİZ' };
  }
  return { kicker: deal.discountSummary, value: deal.headline };
}

function dealBadge(deal: PublicDeal): string {
  const pct = percentFromBps(deal.discountPercentBps);
  if (deal.firstOrderOnly) return 'Yalnızca İlk Sipariş';
  if (deal.kind === 'PERCENT_CART' && pct != null) return `−%${pct} İndirimli`;
  if (deal.kind === 'FIXED_CART_MINOR' && deal.discountMinor) {
    return `−${formatTryMinor(deal.discountMinor, 'TRY')}`;
  }
  if (deal.kind === 'DELIVERY_FEE_WAIVER') return 'Daimi Teslimat Avantajı';
  return dealKindLabel(deal.kind);
}

function splitComboName(name: string): [string, string] {
  const idx = name.indexOf(':');
  if (idx === -1) return [name, ''];
  return [name.slice(0, idx + 1), name.slice(idx + 1).trim()];
}

const FEATURE_ICONS = ['skillet', 'package_2', 'award_star'] as const;
const BRAND_FEATURES = [
  { title: 'Ateşte Mühürlü', subtitle: '%100 Dana Döş' },
  { title: 'Termal Garanti', subtitle: 'Sıcak Kutu Teslimatı' },
  { title: 'Şef Sosu Dahil', subtitle: 'Ev Yapımı Sos' },
] as const;

export function DealsPage(): React.ReactElement {
  const router = useRouter();
  const { home, refreshCart } = useStorefrontChrome();
  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [filter, setFilter] = useState<DealFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [comboBusy, setComboBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useDeferredLoad(() => {
    void (async () => {
      try {
        const list = await fetchPublicDeals();
        setDeals(list);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [nonce]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const copyCode = useCallback(
    (code: string) => {
      setStoredCouponCode(code);
      setCopiedCode(code);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(code).catch(() => {
          /* sessiz — kullanıcı kodu seçebilir */
        });
      }
      showToast(`"${code}" kodu kopyalandı! Sepette kullanabilirsiniz.`);
    },
    [showToast],
  );

  const useCode = useCallback(
    (code: string) => {
      copyCode(code);
      router.push('/cart');
    },
    [copyCode, router],
  );

  const combo = home?.combo ?? null;
  const cartDeals = useMemo(() => deals.filter((d) => dealBucket(d.kind) === 'cart'), [deals]);
  const takeawayDeals = useMemo(
    () => deals.filter((d) => dealBucket(d.kind) === 'takeaway'),
    [deals],
  );
  const comboCount = combo ? 1 : 0;
  const visibleDeals = filter === 'cart' ? cartDeals : filter === 'takeaway' ? takeawayDeals : deals;
  const showCombo = Boolean(combo) && (filter === 'all' || filter === 'combo');
  const showGrid = filter !== 'combo';
  const empty = !showCombo && visibleDeals.length === 0;

  const addCombo = useCallback(async () => {
    if (!combo || combo.expired) return;
    setComboBusy(true);
    try {
      await addComboItemsToCart(combo.items);
      await refreshCart();
      showToast(`${combo.name} sepetinize eklendi!`);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setComboBusy(false);
    }
  }, [combo, refreshCart, showToast]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return (
      <ShopError
        title="Fırsatlar yüklenemedi"
        message={error ?? 'Bilinmeyen bir hata oluştu.'}
        onRetry={() => setNonce((n) => n + 1)}
        surface="deals"
      />
    );
  }

  const tabs: Array<{ id: DealFilter; label: string; count: number }> = [
    { id: 'all', label: 'Tüm Fırsatlar', count: deals.length + comboCount },
    { id: 'combo', label: 'Kombo Menüler', count: comboCount },
    { id: 'cart', label: 'Sepet Kuponları', count: cartDeals.length },
    { id: 'takeaway', label: 'Teslimat Avantajları', count: takeawayDeals.length },
  ];

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="deals">
      <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-space-sm px-space-md py-3 rounded-lg bg-surface-container-high shadow-xl text-on-surface transition-all duration-300 ${
          toast
            ? 'translate-y-0 opacity-100'
            : 'translate-y-32 opacity-0 pointer-events-none'
        }`}
        role="status"
      >
        <MaterialIcon name="check_circle" className="text-secondary-container text-xl" />
        <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface">
          {toast ?? ''}
        </span>
      </div>

      <section className="relative w-full overflow-hidden bg-surface-container-lowest pt-space-xl pb-space-lg">
        <div
          aria-hidden
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-secondary-container/10 rounded-full blur-[140px] pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute top-1/4 -right-24 w-96 h-96 bg-primary-container/15 rounded-full blur-[120px] pointer-events-none"
        />
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-space-sm py-1.5 rounded-full bg-primary-container/20 text-primary mb-space-md">
            <MaterialIcon name="local_fire_department" className="text-sm text-primary" filled />
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
              Alevde Kazananlar Kulübü · Sınırlı Süreli Fırsatlar
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase max-w-4xl tracking-tight">
            DUMANI ÜSTÜNDE <span className="text-secondary-container">İNDİRİMLER</span> &amp; GURME
            KOMBOLAR
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-space-sm mb-space-xl">
            Ateşte mühürlenmiş smash lezzetleri, şefin özel eşleşmeleri ve sepette ekstra avantaj
            sağlayan haftalık indirim kuponları.
          </p>
          <div className="w-full flex items-center justify-start sm:justify-center gap-space-xs overflow-x-auto pb-space-xs">
            {tabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`promo-filter-btn shrink-0 px-space-md py-2.5 rounded-lg font-label-md text-label-md uppercase transition-all ${
                    active
                      ? 'bg-secondary-container text-on-secondary-container font-bold shadow-md'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {showCombo && combo ? (
        <ComboSpotlight
          combo={combo}
          now={now}
          busy={comboBusy}
          onAdd={() => void addCombo()}
        />
      ) : null}

      <section className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin mb-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm pb-space-lg">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <MaterialIcon name="percent" className="text-base" />
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider">
                Avantajlı Fırsat Listesi
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase">
              GÜNCEL İNDİRİM &amp; KAMPANYALAR
            </h2>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Toplam {showGrid ? visibleDeals.length : comboCount} aktif kampanya listeleniyor
          </span>
        </div>

        {empty ? (
          <div className="rounded-xl bg-surface-container-low p-space-xl text-center">
            <p className="font-headline-sm text-headline-sm text-on-surface uppercase">
              Bu kategoride aktif fırsat yok
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              Yeni kampanyalar yolda — menüden göz atabilirsin.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-space-md h-10 px-space-md rounded-lg bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase font-bold"
            >
              <MaterialIcon name="restaurant_menu" className="text-base" />
              Menüye Git
            </Link>
          </div>
        ) : showGrid ? (
          <ul
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter list-none p-0 m-0"
            data-ff-deals-grid
          >
            {visibleDeals.map((deal) => (
              <li key={deal.id}>
                <DealCard
                  deal={deal}
                  copiedCode={copiedCode}
                  onCopy={copyCode}
                  onUse={useCode}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <HowToSection />
    </main>
  );
}

function ComboSpotlight(props: {
  combo: HomeCombo;
  now: number | null;
  busy: boolean;
  onAdd: () => void;
}): React.ReactElement {
  const { combo, now, busy, onAdd } = props;
  const [lead, rest] = splitComboName(combo.name);
  const remaining =
    now != null && combo.endsAt ? formatHms(Date.parse(combo.endsAt) - now) : null;
  const features =
    combo.items.length > 0
      ? combo.items.slice(0, 3).map((item, i) => ({
          icon: FEATURE_ICONS[i] ?? 'skillet',
          title: item.name,
          subtitle: `${item.quantity} adet`,
        }))
      : BRAND_FEATURES.map((f, i) => ({
          icon: FEATURE_ICONS[i] ?? 'skillet',
          title: f.title,
          subtitle: f.subtitle,
        }));

  return (
    <section className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin -mt-4 mb-space-xl relative z-20">
      <div className="w-full rounded-xl bg-surface-container-low shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 relative group">
        <div className="lg:col-span-7 p-space-lg lg:p-space-xl flex flex-col justify-between relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-space-sm mb-space-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-secondary-container/20 text-secondary-container font-label-sm text-label-sm uppercase font-bold">
                <MaterialIcon name="stars" className="text-sm" filled />
                Günün Yıldız Kombosu
              </span>
              {combo.savingsPercent != null ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm uppercase font-bold">
                  Sepette %{combo.savingsPercent}&apos;a Varan Avantaj
                </span>
              ) : null}
              {combo.expired ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm uppercase">
                  <MaterialIcon name="schedule" className="text-sm text-secondary-container" />
                  Süresi doldu
                </span>
              ) : remaining ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm uppercase">
                  <MaterialIcon name="schedule" className="text-sm text-secondary-container" />
                  Kalan Süre: {remaining}
                </span>
              ) : null}
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-tight leading-none mb-space-sm">
              {lead}
              {rest ? (
                <>
                  <br />
                  <span className="text-secondary-container">{rest}</span>
                </>
              ) : null}
            </h2>
            {combo.description ? (
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mb-space-lg leading-relaxed">
                {combo.description}
              </p>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mb-space-lg">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container"
                >
                  <MaterialIcon name={feature.icon} className="text-secondary-container text-base" />
                  <div className="flex flex-col text-left">
                    <span className="font-label-sm text-label-sm text-on-surface uppercase">
                      {feature.title}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">{feature.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-space-md mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div className="flex items-baseline gap-3">
              <div className="flex flex-col">
                {combo.compareAtMinor ? (
                  <span className="font-label-sm text-label-sm text-on-surface-variant line-through uppercase tracking-wider">
                    {formatTryMinor(combo.compareAtMinor, combo.currency)}
                  </span>
                ) : null}
                <span className="font-headline-lg text-headline-lg text-secondary-container leading-none">
                  {formatTryMinor(combo.bundlePriceMinor, combo.currency)}
                </span>
              </div>
              {combo.savingsPercent != null ? (
                <span className="px-2 py-1 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm uppercase font-bold tracking-wide">
                  %{combo.savingsPercent} Tasarruf
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                className="flex items-center justify-center gap-2 h-12 px-space-lg rounded-lg bg-secondary-container hover:brightness-110 text-on-secondary-container font-label-md text-label-md uppercase font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                type="button"
                onClick={onAdd}
                disabled={busy || combo.expired}
              >
                <MaterialIcon name="shopping_bag" className="text-lg" />
                <span>
                  {combo.expired ? 'Süresi doldu' : busy ? 'Ekleniyor…' : 'Tek Tıkla Sepete Ekle'}
                </span>
              </button>
              <Link
                href={combo.items[0] ? `/products/${combo.items[0].productId}` : '/'}
                className="flex items-center justify-center h-12 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md uppercase font-semibold transition-colors"
              >
                Özelleştir
              </Link>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-[460px] bg-surface-container-high overflow-hidden flex items-center justify-center">
          {combo.imageUrl ? (
            <img
              alt={combo.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              src={combo.imageUrl}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-container-highest via-surface-container to-surface-container-lowest flex items-center justify-center">
              <MaterialIcon name="inventory_2" className="text-7xl text-secondary-container/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent lg:bg-gradient-to-r lg:from-surface-container-low lg:via-transparent lg:to-transparent" />
          <div className="absolute top-4 right-4 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-2 rounded-lg flex items-center gap-2 text-secondary-container shadow-xl">
            <MaterialIcon name="local_fire_department" className="text-base" />
            <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider">
              Haftanın Favorisi
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DealCard(props: {
  deal: PublicDeal;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onUse: (code: string) => void;
}): React.ReactElement {
  const { deal, copiedCode, onCopy, onUse } = props;
  const value = dealValue(deal);
  const automatic = !deal.code;
  const copied = copiedCode === deal.code;

  return (
    <article
      data-ff-deal
      className="flex flex-col justify-between rounded-xl bg-surface-container-low overflow-hidden hover:bg-surface-container transition-all duration-300 shadow-md group h-full"
    >
      <div className="relative h-48 overflow-hidden bg-surface-container-high">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-highest via-surface-container to-surface-container-lowest">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-secondary-container/20 blur-3xl"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <MaterialIcon
              name={dealKindIcon(deal.kind)}
              className="text-6xl text-secondary-container/35"
            />
          </div>
        </div>
        <div className="absolute top-3 left-3 bg-primary-container text-on-primary-container px-2.5 py-1 rounded font-label-sm text-label-sm uppercase font-bold">
          {dealBadge(deal)}
        </div>
        <div className="absolute bottom-3 left-3 bg-surface-container-lowest/80 backdrop-blur-sm px-2 py-0.5 rounded text-secondary-container font-label-sm text-label-sm uppercase">
          {automatic ? 'Kod Gerekmez' : dealKindLabel(deal.kind)}
        </div>
      </div>
      <div className="p-space-md flex flex-col flex-1">
        <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-tight mb-1">
          {deal.headline}
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
          {deal.description ?? deal.discountSummary}
        </p>
        {deal.code ? (
          <div className="mt-auto flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest mb-space-md">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 leading-none">
                Kupon Kodu
              </span>
              <span
                className="font-headline-sm text-base text-secondary-container tracking-widest mt-0.5 select-all"
                data-ff-deal-summary
              >
                {deal.code}
              </span>
            </div>
            <button
              className="px-2.5 py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm uppercase transition-colors flex items-center gap-1"
              type="button"
              onClick={() => onCopy(deal.code as string)}
              data-ff-deal-copy
            >
              <MaterialIcon name={copied ? 'check' : 'content_copy'} className="text-sm" />
              <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
            </button>
          </div>
        ) : (
          <div className="mt-auto flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-lowest mb-space-md text-on-surface-variant">
            <MaterialIcon name="check_circle" className="text-secondary-container text-lg" />
            <span className="font-label-sm text-label-sm uppercase text-on-surface">
              Ödeme adımında otomatik uygulanır
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-space-xs">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              {value.kicker}
            </span>
            <span className="font-headline-md text-headline-md text-secondary-container leading-none">
              {value.value}
            </span>
          </div>
          {deal.code ? (
            <button
              type="button"
              onClick={() => onUse(deal.code as string)}
              className="h-10 px-space-md rounded-lg bg-secondary-container hover:brightness-110 text-on-secondary-container font-label-sm text-label-sm uppercase font-bold flex items-center gap-1.5 transition-all"
            >
              <MaterialIcon name="loyalty" className="text-base" />
              <span>Kodu Kullan</span>
            </button>
          ) : (
            <Link
              href="/"
              className="h-10 px-space-md rounded-lg bg-primary-container hover:brightness-110 text-on-primary-container font-label-sm text-label-sm uppercase font-bold flex items-center gap-1.5 transition-all"
            >
              <MaterialIcon name="storefront" className="text-base" />
              <span>Menüye Git</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function HowToSection(): React.ReactElement {
  return (
    <section className="w-full bg-surface-container-low py-space-xl mb-space-xl">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin">
        <div className="text-center max-w-xl mx-auto mb-space-lg">
          <div className="inline-flex items-center gap-1 text-secondary-container mb-1">
            <MaterialIcon name="help" className="text-base" />
            <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider">
              Hızlı Rehber
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface uppercase">
            KUPON KODU NASIL KULLANILIR?
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            3 basit adımda kupon kodunu siparişine tanımla, ateşte pişen lezzeti avantajlı fiyatla
            kapına getir.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          <HowToStep
            icon="copy_all"
            tone="mustard"
            step="ADIM 01"
            title="Kampanyanı Seç & Kopyala"
            body='Yukarıdaki listeden damak zevkine uygun fırsatı belirle ve kupon kodunun yanındaki "Kopyala" butonuna tıkla.'
          />
          <HowToStep
            icon="shopping_cart_checkout"
            tone="flame"
            step="ADIM 02"
            title="Sepet Sayfasına Yapıştır"
            body='Sepetim ekranında bulunan "Promosyon / İndirim Kodu" alanına kopyaladığın kodu gir ve "Uygula" tuşuna bas.'
          />
          <HowToStep
            icon="moped"
            tone="mustard"
            step="ADIM 03"
            title="Sıcak & Hızlı Teslim Al"
            body="İndirim anında toplam tutardan düşsün! Kuryemiz 25-35 dakika içinde dumanı tüten siparişini kapına ulaştırsın."
          />
        </div>
      </div>
    </section>
  );
}

function HowToStep(props: {
  icon: string;
  tone: 'mustard' | 'flame';
  step: string;
  title: string;
  body: string;
}): React.ReactElement {
  const color = props.tone === 'flame' ? 'text-primary' : 'text-secondary-container';
  return (
    <div className="flex flex-col items-center text-center p-space-lg rounded-xl bg-surface-container relative">
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-secondary-container mb-space-sm shadow-md">
        <MaterialIcon name={props.icon} className={`text-2xl ${color}`} />
      </div>
      <span className={`font-label-sm text-label-sm uppercase tracking-wider font-bold mb-1 ${color}`}>
        {props.step}
      </span>
      <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase mb-2">
        {props.title}
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{props.body}</p>
    </div>
  );
}
