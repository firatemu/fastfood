import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StackHeader } from '../components/stack-header';
import { ErrorBlock, LoadingBlock } from '../components/ui';
import { formatApiError } from '../lib/api';
import { addComboItemsToCart } from '../lib/cart';
import { fetchPublicDeals } from '../lib/content';
import { setStoredCouponCode } from '../lib/coupon-store';
import { fetchStorefrontHome } from '../lib/home';
import { formatTryMinor } from '../lib/money';
import type { PublicDeal, StorefrontHome } from '../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../theme';

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

function dealKindIcon(kind: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (kind) {
    case 'PERCENT_CART':
      return 'brightness-percent';
    case 'FIXED_CART_MINOR':
      return 'ticket-percent';
    case 'DELIVERY_FEE_WAIVER':
      return 'moped';
    default:
      return 'tag';
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

export default function DealsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [home, setHome] = useState<StorefrontHome | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DealFilter>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [comboBusy, setComboBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    setStatus('loading');
    void (async () => {
      try {
        const [list, payload] = await Promise.all([fetchPublicDeals(), fetchStorefrontHome()]);
        setDeals(list);
        setHome(payload);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const copyCode = useCallback((code: string) => {
    setStoredCouponCode(code);
    setCopiedCode(code);
    void Clipboard.setStringAsync(code).then(() => {
      setToast(`"${code}" kodu kopyalandı! Sepette kullanabilirsiniz.`);
    });
  }, []);

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
    if (!combo || !home || combo.expired) return;
    setComboBusy(true);
    try {
      await addComboItemsToCart(combo.items, home.products);
      setToast(`${combo.name} sepetinize eklendi!`);
    } catch (err) {
      setToast(formatApiError(err));
    } finally {
      setComboBusy(false);
    }
  }, [combo, home]);

  if (status === 'loading') return <LoadingBlock label="Fırsatlar yükleniyor…" />;
  if (status === 'error') {
    return (
      <View style={styles.padded}>
        <ErrorBlock title="Fırsatlar yüklenemedi" message={error ?? ''} onRetry={load} />
      </View>
    );
  }

  const tabs: Array<{ id: DealFilter; label: string; count: number }> = [
    { id: 'all', label: 'Tüm Fırsatlar', count: deals.length + comboCount },
    { id: 'combo', label: 'Kombo Menüler', count: comboCount },
    { id: 'cart', label: 'Sepet Kuponları', count: cartDeals.length },
    { id: 'takeaway', label: 'Teslimat', count: takeawayDeals.length },
  ];

  return (
    <View style={styles.screen}>
      <StackHeader title="İndirimler & Fırsatlar" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="fire" size={14} color={colors.flame} />
            <Text style={styles.heroBadgeText}>ALEVDE KAZANANLAR · SINIRLI SÜRE</Text>
          </View>
          <Text style={styles.heroTitle}>
            DUMANI ÜSTÜNDE{'\n'}
            <Text style={styles.heroTitleAccent}>İNDİRİMLER</Text>
            {'\n'}& GURME KOMBOLAR
          </Text>
          <Text style={styles.heroLede}>
            Ateşte mühürlenmiş smash lezzetleri, şefin özel eşleşmeleri ve sepette ekstra avantaj
            sağlayan haftalık indirim kuponları.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                onPress={() => setFilter(tab.id)}
                style={[styles.tab, active ? styles.tabActive : null]}
              >
                <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {showCombo && combo ? (
          <ComboSpotlight
            combo={combo}
            now={now}
            busy={comboBusy}
            onAdd={() => void addCombo()}
            onCustomize={() => {
              const first = combo.items[0];
              if (first) router.push(`/products/${first.productId}`);
              else router.push('/');
            }}
          />
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionKicker}>AVANTAJLI FIRSAT LİSTESİ</Text>
          <Text style={styles.sectionTitle}>GÜNCEL İNDİRİM & KAMPANYALAR</Text>
          <Text style={styles.sectionMeta}>
            Toplam {showGrid ? visibleDeals.length : comboCount} aktif kampanya listeleniyor
          </Text>
        </View>

        {empty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>BU KATEGORİDE AKTİF FIRSAT YOK</Text>
            <Text style={styles.emptyBody}>Yeni kampanyalar yolda — menüden göz atabilirsin.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.emptyCta}>
              <Text style={styles.emptyCtaText}>Menüye Git</Text>
            </Pressable>
          </View>
        ) : showGrid ? (
          visibleDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              copiedCode={copiedCode}
              onCopy={copyCode}
              onUse={(code) => {
                copyCode(code);
                router.push('/cart');
              }}
              onMenu={() => router.push('/')}
            />
          ))
        ) : null}

        <HowToSection />
      </ScrollView>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 16 }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color={colors.mustard} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ComboSpotlight(props: {
  combo: HomeCombo;
  now: number;
  busy: boolean;
  onAdd: () => void;
  onCustomize: () => void;
}): React.ReactElement {
  const { combo, now, busy, onAdd, onCustomize } = props;
  const [lead, rest] = splitComboName(combo.name);
  const remaining = combo.endsAt ? formatHms(Date.parse(combo.endsAt) - now) : null;
  const features =
    combo.items.length > 0
      ? combo.items.slice(0, 3).map((item) => ({
          title: item.name,
          subtitle: `${item.quantity} adet`,
        }))
      : [
          { title: 'Ateşte Mühürlü', subtitle: '%100 Dana Döş' },
          { title: 'Termal Garanti', subtitle: 'Sıcak Kutu Teslimatı' },
          { title: 'Şef Sosu Dahil', subtitle: 'Ev Yapımı Sos' },
        ];

  return (
    <View style={styles.spotlight}>
      <View style={styles.spotlightMedia}>
        {combo.imageUrl ? (
          <Image source={{ uri: combo.imageUrl }} style={styles.spotlightImage} contentFit="cover" />
        ) : (
          <View style={styles.spotlightFallback}>
            <MaterialCommunityIcons name="food" size={48} color={colors.mustard} />
          </View>
        )}
        <View style={styles.spotlightStamp}>
          <MaterialCommunityIcons name="fire" size={14} color={colors.mustard} />
          <Text style={styles.spotlightStampText}>HAFTANIN FAVORİSİ</Text>
        </View>
      </View>
      <View style={styles.spotlightBody}>
        <View style={styles.pillRow}>
          <View style={styles.goldPill}>
            <Text style={styles.goldPillText}>GÜNÜN YILDIZ KOMBOSU</Text>
          </View>
          {combo.savingsPercent != null ? (
            <View style={styles.flamePill}>
              <Text style={styles.flamePillText}>%{combo.savingsPercent} AVANTAJ</Text>
            </View>
          ) : null}
        </View>
        {remaining ? (
          <Text style={styles.countdown}>
            {combo.expired ? 'SÜRESİ DOLDU' : `KALAN SÜRE: ${remaining}`}
          </Text>
        ) : null}
        <Text style={styles.spotlightTitle}>
          {lead}
          {rest ? <Text style={styles.spotlightTitleAccent}>{'\n'}{rest}</Text> : null}
        </Text>
        {combo.description ? (
          <Text style={styles.spotlightBodyText}>{combo.description}</Text>
        ) : null}
        <View style={styles.featureRow}>
          {features.map((f) => (
            <View key={f.title} style={styles.feature}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureSub}>{f.subtitle}</Text>
            </View>
          ))}
        </View>
        <View style={styles.priceRow}>
          <View>
            {combo.compareAtMinor ? (
              <Text style={styles.compare}>{formatTryMinor(combo.compareAtMinor, combo.currency)}</Text>
            ) : null}
            <Text style={styles.price}>{formatTryMinor(combo.bundlePriceMinor, combo.currency)}</Text>
          </View>
          {combo.savingsPercent != null ? (
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>%{combo.savingsPercent} TASARRUF</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.ctaRow}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || combo.expired}
            onPress={onAdd}
            style={[styles.ctaPrimary, busy ? styles.ctaDisabled : null]}
          >
            <MaterialCommunityIcons name="shopping" size={16} color={colors.onMustard} />
            <Text style={styles.ctaPrimaryText}>
              {combo.expired ? 'Süresi doldu' : busy ? 'Ekleniyor…' : 'Tek Tıkla Sepete Ekle'}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCustomize} style={styles.ctaGhost}>
            <Text style={styles.ctaGhostText}>Özelleştir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DealCard(props: {
  deal: PublicDeal;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onUse: (code: string) => void;
  onMenu: () => void;
}): React.ReactElement {
  const { deal, copiedCode, onCopy, onUse, onMenu } = props;
  const value = dealValue(deal);
  const automatic = !deal.code;
  const copied = copiedCode === deal.code;

  return (
    <View style={styles.card} accessibilityLabel={deal.headline}>
      <View style={styles.cardMedia}>
        <MaterialCommunityIcons
          name={dealKindIcon(deal.kind)}
          size={42}
          color="rgba(254,179,0,0.35)"
        />
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{dealBadge(deal)}</Text>
        </View>
        <View style={styles.cardChip}>
          <Text style={styles.cardChipText}>
            {automatic ? 'Kod Gerekmez' : dealKindLabel(deal.kind)}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{deal.headline}</Text>
        <Text style={styles.cardDesc}>{deal.description ?? deal.discountSummary}</Text>
        {deal.code ? (
          <View style={styles.codeStrip}>
            <View>
              <Text style={styles.codeLabel}>KUPON KODU</Text>
              <Text style={styles.codeValue}>{deal.code}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => onCopy(deal.code as string)}
              style={styles.copyBtn}
            >
              <MaterialCommunityIcons
                name={copied ? 'check' : 'content-copy'}
                size={14}
                color={colors.onSurface}
              />
              <Text style={styles.copyBtnText}>{copied ? 'Kopyalandı' : 'Kopyala'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.autoStrip}>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.mustard} />
            <Text style={styles.autoStripText}>Ödeme adımında otomatik uygulanır</Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardKicker}>{value.kicker}</Text>
            <Text style={styles.cardValue}>{value.value}</Text>
          </View>
          {deal.code ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onUse(deal.code as string)}
              style={styles.useBtn}
            >
              <Text style={styles.useBtnText}>Kodu Kullan</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={onMenu} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>Menüye Git</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function HowToSection(): React.ReactElement {
  const steps = [
    {
      n: 'ADIM 01',
      title: 'Kampanyanı Seç & Kopyala',
      body: 'Listeden fırsatı belirle ve kupon kodunun yanındaki Kopyala butonuna dokun.',
    },
    {
      n: 'ADIM 02',
      title: 'Sepet Sayfasına Yapıştır',
      body: 'Sepette Promosyon / İndirim Kodu alanına kodu gir ve Uygula’ya bas.',
    },
    {
      n: 'ADIM 03',
      title: 'Sıcak & Hızlı Teslim Al',
      body: 'İndirim anında toplamdan düşer; kurye 25-35 dakikada siparişi kapına getirir.',
    },
  ];
  return (
    <View style={styles.how}>
      <Text style={styles.howKicker}>HIZLI REHBER</Text>
      <Text style={styles.howTitle}>KUPON KODU NASIL KULLANILIR?</Text>
      {steps.map((s) => (
        <View key={s.n} style={styles.howStep}>
          <Text style={styles.howStepN}>{s.n}</Text>
          <Text style={styles.howStepTitle}>{s.title}</Text>
          <Text style={styles.howStepBody}>{s.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { paddingBottom: space.xl, gap: space.md },

  hero: {
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    gap: 10,
    backgroundColor: colors.surfaceLowest,
    paddingBottom: space.lg,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,87,34,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.flame,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: fonts.anton,
    fontSize: 32,
    lineHeight: 36,
    color: colors.onSurface,
    letterSpacing: 0.4,
  },
  heroTitleAccent: { color: colors.mustard },
  heroLede: {
    fontFamily: fonts.jakarta,
    fontSize: 15,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },

  tabs: { paddingHorizontal: space.gutter, gap: 8 },
  tab: {
    minHeight: minTouch,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.mustard },
  tabText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  tabTextActive: { color: colors.onMustard },

  spotlight: {
    marginHorizontal: space.gutter,
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
    overflow: 'hidden',
  },
  spotlightMedia: { height: 200, backgroundColor: colors.surfaceHigh },
  spotlightImage: { width: '100%', height: '100%' },
  spotlightFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spotlightStamp: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(13,14,17,0.9)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  spotlightStampText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.mustard,
    letterSpacing: 0.6,
  },
  spotlightBody: { padding: space.md, gap: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goldPill: {
    backgroundColor: 'rgba(254,179,0,0.18)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goldPillText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.mustard,
    letterSpacing: 0.6,
  },
  flamePill: {
    backgroundColor: 'rgba(255,87,34,0.18)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  flamePillText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.flame,
    letterSpacing: 0.6,
  },
  countdown: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  spotlightTitle: {
    fontFamily: fonts.anton,
    fontSize: 28,
    lineHeight: 32,
    color: colors.onSurface,
  },
  spotlightTitleAccent: { color: colors.mustard },
  spotlightBodyText: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feature: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 8,
  },
  featureTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  featureSub: { fontFamily: fonts.jakarta, fontSize: 10, color: colors.ash, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  compare: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.ash,
    textDecorationLine: 'line-through',
  },
  price: { fontFamily: fonts.anton, fontSize: 28, color: colors.mustard, lineHeight: 32 },
  saveBadge: {
    backgroundColor: colors.flame,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveBadgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.5,
  },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ctaPrimary: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mustard,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaPrimaryText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onMustard,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ctaGhost: {
    minHeight: minTouch,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctaGhostText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },

  sectionHead: { paddingHorizontal: space.gutter, gap: 4 },
  sectionKicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.flame,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontFamily: fonts.anton,
    fontSize: 22,
    color: colors.onSurface,
  },
  sectionMeta: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },

  card: {
    marginHorizontal: space.gutter,
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardMedia: {
    height: 140,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.flame,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardBadgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.white,
    textTransform: 'uppercase',
  },
  cardChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(13,14,17,0.8)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardChipText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.mustard,
    textTransform: 'uppercase',
  },
  cardBody: { padding: space.md, gap: 10 },
  cardTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 18,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  codeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    padding: 10,
  },
  codeLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 9,
    color: colors.ash,
    letterSpacing: 0.6,
  },
  codeValue: {
    fontFamily: fonts.anton,
    fontSize: 18,
    color: colors.mustard,
    letterSpacing: 2,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  copyBtnText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  autoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    padding: 10,
  },
  autoStripText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurface,
    textTransform: 'uppercase',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardKicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.ash,
    textTransform: 'uppercase',
  },
  cardValue: { fontFamily: fonts.anton, fontSize: 22, color: colors.mustard, marginTop: 2 },
  useBtn: {
    minHeight: minTouch,
    backgroundColor: colors.mustard,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  useBtnText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onMustard,
    textTransform: 'uppercase',
  },
  menuBtn: {
    minHeight: minTouch,
    backgroundColor: colors.flame,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  menuBtnText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.white,
    textTransform: 'uppercase',
  },

  empty: {
    marginHorizontal: space.gutter,
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
    padding: space.lg,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontFamily: fonts.anton, fontSize: 18, color: colors.onSurface, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash, textAlign: 'center' },
  emptyCta: {
    minHeight: minTouch,
    backgroundColor: colors.mustard,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onMustard,
    textTransform: 'uppercase',
  },

  how: {
    marginTop: space.sm,
    backgroundColor: colors.surfaceLow,
    padding: space.lg,
    gap: 12,
  },
  howKicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.mustard,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  howTitle: {
    fontFamily: fonts.anton,
    fontSize: 22,
    color: colors.onSurface,
    textAlign: 'center',
  },
  howStep: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: space.md,
    gap: 4,
  },
  howStepN: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.mustard,
    letterSpacing: 0.8,
  },
  howStepTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 16,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  howStepBody: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },

  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
