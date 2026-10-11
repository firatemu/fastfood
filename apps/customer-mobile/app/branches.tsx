import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StackHeader } from '../components/stack-header';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/ui';
import { formatApiError } from '../lib/api';
import {
  fetchContentBySlug,
  fetchCustomerBranches,
} from '../lib/content';
import { groupOperatingHours } from '../lib/hours';
import { formatDeliveryWindow } from '../lib/money';
import type { CustomerBranch, StorefrontContent } from '../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../theme';

const CITY_ORDER = ['ADANA', 'OSMANİYE', 'GAZİANTEP', 'MERSİN', 'İSTANBUL'] as const;

function branchCity(branch: CustomerBranch): string {
  const m = branch.addressLine.match(/\/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*$/);
  if (!m || !m[1]) return '';
  return m[1].toUpperCase();
}

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function fulfillmentChip(b: CustomerBranch): { label: string; icon: string } {
  if (!b.isAcceptingOrders) return { label: 'Şu an kapalı', icon: 'do_not_disturb_on' };
  const delivery = b.deliveryEnabled !== false;
  const pickup = b.pickupEnabled !== false;
  if (delivery && pickup) return { label: 'Teslimat + Gel-al', icon: 'delivery_dining' };
  if (delivery) return { label: 'Yalnız Teslimat', icon: 'delivery_dining' };
  if (pickup) return { label: 'Yalnız Gel-al', icon: 'storefront' };
  return { label: 'Hizmet dışı', icon: 'remove_circle' };
}

export default function BranchesRoute(): React.ReactElement {
  const router = useRouter();
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [story, setStory] = useState<StorefrontContent | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string>('TÜMÜ');

  const load = useCallback(() => {
    setStatus('loading');
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

  const cityOptions = useMemo(() => {
    const out: Array<{ key: string; label: string; count: number }> = [
      { key: 'TÜMÜ', label: 'Tümü', count: branches.length },
    ];
    for (const c of CITY_ORDER) {
      const items = grouped.get(c);
      if (items) {
        out.push({
          key: c,
          label: c.charAt(0) + c.slice(1).toLowerCase(),
          count: items.length,
        });
      }
    }
    return out;
  }, [grouped, branches.length]);

  const visible = useMemo(() => {
    if (activeCity === 'TÜMÜ') return branches;
    return grouped.get(activeCity) ?? [];
  }, [activeCity, branches, grouped]);

  const cityCount = grouped.size;
  const openCount = branches.filter((b) => b.isActive && b.isAcceptingOrders).length;

  return (
    <View style={styles.screen}>
      <StackHeader title="Şubeler" />
      {status === 'loading' ? <LoadingBlock label="Şubeler yükleniyor…" /> : null}
      {status === 'error' ? (
        <View style={styles.padded}>
          <ErrorBlock title="Şubeler yüklenemedi" message={error ?? ''} onRetry={load} />
        </View>
      ) : null}
      {status === 'ready' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.eyebrow}>Şubeler & Ağımız</Text>
            </View>
            <Text style={styles.heroTitle}>
              {story?.title ?? 'BURGER HOME'}
              {'\n'}
              <Text style={styles.heroTitleAccent}>Şube Ağı</Text>
            </Text>
            <Text style={styles.heroBody}>
              {story?.body ??
                'Türkiye genelinde yayılan Burger Home şubelerimizde aynı lezzet standardı, aynı döküm ızgara tekniği, aynı ev yapımı soslar.'}
            </Text>
          </View>

          {/* Meta panel */}
          <View style={styles.metaPanel}>
            <Text style={styles.metaBig}>
              {String(branches.length).padStart(2, '0')}
            </Text>
            <View style={styles.metaRows}>
              <MetaRow label="Şube" value={branches.length} />
              <MetaRow label="Şehir" value={cityCount} />
              <MetaRow label="Açık" value={openCount} />
              <MetaRow label="Ortalama teslimat" value="25-35 dk" />
            </View>
            <Text style={styles.metaHint}>
              Tüm şubelerimiz hafta içi ve hafta sonu aynı saatlerde hizmet verir.
            </Text>
          </View>

          {/* City tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
          >
            {cityOptions.map((opt) => {
              const active = activeCity === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setActiveCity(opt.key)}
                  style={styles.tab}
                >
                  <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                    {opt.label} ({opt.count})
                  </Text>
                  <View style={[styles.tabUnderline, active ? styles.tabUnderlineActive : null]} />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Cards (split layout) */}
          {visible.length === 0 ? (
            <EmptyBlock title="Şube yok" message="Bu şehirde yayınlanmış şube bulunamadı." />
          ) : (
            visible.map((branch) => {
              const hours = groupOperatingHours(branch.hours ?? []);
              const eta = formatDeliveryWindow(
                branch.estimatedDeliveryMinutesMin ?? 0,
                branch.estimatedDeliveryMinutesMax ?? 0,
              );
              const city = branchCity(branch);
              const hasMap =
                typeof branch.latitude === 'number' && typeof branch.longitude === 'number';
              const fchip = fulfillmentChip(branch);
              return (
                <View
                  key={branch.id}
                  style={styles.card}
                  accessibilityLabel={`${branch.name}, ${city}`}
                >
                  <View style={styles.cardAside}>
                    <View style={styles.cardAsideAccent} />
                    <Text style={styles.city}>{city || 'ŞUBE'}</Text>
                    {branch.code ? (
                      <Text style={styles.code}>{branch.code}</Text>
                    ) : null}
                    {branch.isAcceptingOrders ? (
                      <View style={styles.statusOpen}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusOpenText}>AÇIK</Text>
                      </View>
                    ) : (
                      <View style={styles.statusClosed}>
                        <Text style={styles.statusClosedText}>KAPALI</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{branch.name}</Text>
                    <Text style={styles.cardAddress}>{branch.addressLine}</Text>

                    {branch.phone ? (
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => void Linking.openURL(`tel:${branch.phone}`)}
                        style={styles.phone}
                      >
                        <Text style={styles.phoneText}>📞 {branch.phone}</Text>
                      </Pressable>
                    ) : null}

                    <View style={styles.metaRow}>
                      <Text style={styles.metaItem}>
                        {labelForIcon(fchip.icon)} {fchip.label}
                      </Text>
                      {eta && branch.deliveryEnabled !== false ? (
                        <Text style={styles.metaItem}>⚡ {eta}</Text>
                      ) : null}
                    </View>

                    {hours.length > 0 ? (
                      <View style={styles.hoursBox}>
                        {hours.map((row, i) => (
                          <View
                            key={`${row.label}-${i}`}
                            style={styles.hoursRow}
                          >
                            <Text style={styles.hoursDay}>{row.label}</Text>
                            <Text style={styles.hoursTime}>
                              {row.opensAt} – {row.closesAt}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.hoursFallback}>
                        Hafta içi 11:30 – 23:00 · Pazar 12:00 – 23:00
                      </Text>
                    )}

                    <View style={styles.actions}>
                      {branch.deliveryEnabled !== false && branch.isAcceptingOrders ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => router.replace('/')}
                          style={[styles.actionBtn, styles.actionPrimary]}
                        >
                          <Text style={styles.actionPrimaryText}>🍔 Menüye Git</Text>
                        </Pressable>
                      ) : null}
                      {hasMap ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            void Linking.openURL(
                              mapsUrl(branch.latitude as number, branch.longitude as number),
                            )
                          }
                          style={styles.actionLink}
                        >
                          <Text style={styles.actionLinkText}>Yol Tarifi ↗</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Contact CTA */}
          <View style={styles.cta}>
            <Text style={styles.ctaEyebrow}>İletişim</Text>
            <Text style={styles.ctaTitle}>Yeni şubeler için iletişime geçin</Text>
            <Text style={styles.ctaBody}>
              Türkiye genelinde franchise görüşmeleri ve yeni lokasyon önerileri için ekibimizle iletişime geçin.
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL('tel:4441399')}
              style={[styles.ctaBtn, styles.ctaBtnPrimary]}
            >
              <Text style={styles.ctaBtnPrimaryText}>📞 +90 444 1 399</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}): React.ReactElement {
  return (
    <View style={styles.metaRowItem}>
      <Text style={styles.metaRowLabel}>{label}</Text>
      <Text style={styles.metaRowValue}>{value}</Text>
    </View>
  );
}

function labelForIcon(name: string): string {
  switch (name) {
    case 'delivery_dining':
      return '🛵';
    case 'storefront':
      return '🏪';
    case 'do_not_disturb_on':
      return '⛔';
    case 'remove_circle':
      return '🚫';
    default:
      return '•';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter, gap: 16, paddingBottom: 40 },

  // Hero
  hero: { gap: 8, paddingTop: space.sm },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrowLine: { width: 28, height: 1, backgroundColor: colors.mustard },
  eyebrow: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.22,
  },
  heroTitle: {
    fontFamily: fonts.anton,
    fontSize: 36,
    color: colors.onSurface,
    textTransform: 'uppercase',
    lineHeight: 38,
    marginTop: 4,
  },
  heroTitleAccent: { color: colors.mustard, fontSize: 36 },
  heroBody: {
    fontFamily: fonts.jakarta,
    fontSize: 14,
    color: colors.ash,
    lineHeight: 22,
    marginTop: 4,
  },

  // Meta panel
  metaPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
  },
  metaBig: {
    fontFamily: fonts.anton,
    fontSize: 64,
    color: colors.mustard,
    lineHeight: 64,
  },
  metaRows: { gap: 4 },
  metaRowItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  metaRowLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.18,
  },
  metaRowValue: {
    fontFamily: fonts.anton,
    fontSize: 18,
    color: colors.onSurface,
  },
  metaHint: {
    fontFamily: fonts.jakarta,
    fontSize: 11,
    color: colors.ash,
    marginTop: 4,
    lineHeight: 16,
  },

  // City tabs
  tabBar: {
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  tabTextActive: { color: colors.mustard },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    width: '60%',
    backgroundColor: 'transparent',
    borderRadius: 1,
  },
  tabUnderlineActive: { backgroundColor: colors.mustard },

  // Card (split)
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  cardAside: {
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    backgroundColor: colors.surfaceLow,
    gap: 6,
  },
  cardAsideAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.mustard,
  },
  city: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  code: {
    fontFamily: fonts.jakarta,
    fontSize: 10,
    color: colors.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.15,
    opacity: 0.7,
  },
  statusOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(254,179,0,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(254,179,0,0.5)',
    marginTop: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.mustard },
  statusOpenText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.mustard,
    letterSpacing: 0.1,
  },
  statusClosed: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 4,
  },
  statusClosedText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.ash,
    letterSpacing: 0.1,
  },

  cardBody: {
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: {
    fontFamily: fonts.anton,
    fontSize: 26,
    color: colors.onSurface,
    textTransform: 'uppercase',
    lineHeight: 30,
  },
  cardAddress: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.ash,
    lineHeight: 20,
  },
  phone: { alignSelf: 'flex-start' },
  phoneText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 13,
    color: colors.mustard,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
  hoursBox: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLow,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  hoursDay: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
  hoursTime: {
    fontFamily: fonts.jakarta,
    fontSize: 11,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  hoursFallback: {
    fontFamily: fonts.jakarta,
    fontSize: 11,
    color: colors.ash,
    opacity: 0.7,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 8,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  actionBtn: {
    minHeight: minTouch,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionPrimary: { backgroundColor: colors.mustard, paddingHorizontal: 18 },
  actionPrimaryText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onMustard,
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
  actionLink: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  actionLinkText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },

  // CTA
  cta: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    marginTop: 12,
  },
  ctaEyebrow: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.18,
  },
  ctaTitle: {
    fontFamily: fonts.anton,
    fontSize: 22,
    color: colors.onSurface,
    textTransform: 'uppercase',
    marginTop: 2,
    lineHeight: 26,
  },
  ctaBody: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.ash,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  ctaBtn: {
    minHeight: minTouch,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ctaBtnPrimary: { backgroundColor: colors.mustard },
  ctaBtnPrimaryText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 13,
    color: colors.onMustard,
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
});
