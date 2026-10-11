import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchSpin, playSpin } from '../../lib/engagement';
import { newClientRequestId, spinResultCopy } from '../../lib/engagement-map';
import type { SpinEligibility, SpinPlay } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { colors, fonts, minTouch, radius, space } from '../../theme';

function reasonCopy(reason: string): string {
  if (reason === 'NO_CAMPAIGN') return 'Aktif bir çark kampanyası yok.';
  if (reason === 'ALREADY_USED') return 'Bugünkü hakkın kullanıldı.';
  if (reason === 'NO_PRIZES') return 'Kampanya ödülü tanımlı değil.';
  return 'Çark şu an çevrilemiyor.';
}

/**
 * Ateş Çarkı.
 *
 * Stage-first, matching the Web screen: the dial is the one large circular
 * element and the state you are actually in dominates. The prize is decided by
 * the server, and the reveal animates only to the prize the server returned —
 * there is no client-side roulette. The backend sends no next-reset timestamp,
 * so this screen states the real reason and the real campaign end date rather
 * than ticking a countdown that would mean nothing.
 */
export default function AccountSpinRoute() {
  return (
    <View style={styles.screen}>
      <StackHeader title="Ateş Çarkı" />
      <RequireCustomer next="/account/spin">
        <SpinBody />
      </RequireCustomer>
    </View>
  );
}

function SpinBody() {
  const [state, setState] = useState<SpinEligibility | null>(null);
  const [play, setPlay] = useState<SpinPlay | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // `useState` rather than `useRef`: the value is used during render to drive
  // the Animated styles, and reading `ref.current` in render is exactly what
  // react-hooks/refs forbids. An Animated.Value is immutable once created, so
  // state is the correct home for it.
  const [reveal] = useState(() => new Animated.Value(0));

  const load = useCallback(() => {
    setStatus('loading');
    void fetchSpin()
      .then((next) => {
        setState(next);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(formatApiError(err));
        setStatus('error');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!play) return;
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [play, reveal]);

  async function onSpin() {
    if (!state?.eligible || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Server first. Nothing spins until the outcome is known.
      const result = await playSpin(newClientRequestId('spin'));
      setPlay(result);
      setState((prev) =>
        prev
          ? { ...prev, eligible: false, reason: 'ALREADY_USED', spinsRemaining: 0, lastPlay: result }
          : prev,
      );
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') return <LoadingBlock label="Çark yükleniyor…" />;
  if (status === 'error' || !state) {
    return <ErrorBlock title="Çark yüklenemedi" message={error ?? ''} onRetry={load} />;
  }

  const blocked = !state.eligible;
  const resultText = play ? spinResultCopy(play) : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <View style={styles.headRow}>
          <View style={styles.headCopy}>
            <Text style={styles.kicker}>Kampanya</Text>
            <Text style={styles.campaign} numberOfLines={2}>
              {state.campaign?.name ?? 'Aktif kampanya yok'}
            </Text>
            {state.campaign?.endsAt ? (
              <Text style={styles.meta}>
                {formatStorefrontDateTime(state.campaign.endsAt)} tarihinde bitiyor.
              </Text>
            ) : null}
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>
              {busy ? 'Çevriliyor' : state.eligible ? 'Hak hazır' : 'Hak kullanıldı'}
            </Text>
          </View>
        </View>

        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.dial,
              blocked && styles.dialBlocked,
              {
                transform: [
                  {
                    scale: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              },
            ]}
            accessibilityLabel={
              play ? `Sonuç: ${play.prize.label}` : state.eligible ? 'Çarkı çevirebilirsin' : 'Bugün bitti'
            }
          >
            <Text style={styles.dialLabel} numberOfLines={3}>
              {busy ? 'Çevriliyor…' : play ? play.prize.label : state.eligible ? 'Çarkı çevir' : 'Bugün bitti'}
            </Text>
          </Animated.View>

          {state.prizes.length > 0 ? (
            <View style={styles.prizeRow}>
              {state.prizes.map((prize) => (
                <View key={prize.code} style={styles.prizeChip}>
                  <Text style={styles.prizeChipLabel}>{prize.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>Bu kampanyada tanımlı ödül yok.</Text>
          )}
        </View>

        {blocked ? (
          // A real disabled affordance. SecondaryButton has no `disabled`
          // prop, so the blocked state is drawn rather than faked by wiring
          // a no-op handler onto an enabled button.
          <View style={styles.blockedButton} accessibilityRole="text">
            <Text style={styles.blockedLabel}>Bugün bitti</Text>
          </View>
        ) : (
          <MustardButton
            label={busy ? 'Çevriliyor…' : 'Çarkı çevir'}
            loading={busy}
            onPress={() => void onSpin()}
          />
        )}

        {blocked ? (
          <View style={styles.noteRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.ash} />
            <Text style={styles.meta}>
              {reasonCopy(state.reason)} Yeni hakkı sunucu belirliyor; uydurma bir geri sayım
              gösterilmez.
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>{state.spinsRemaining} hak kaldı.</Text>
        )}

        {resultText ? (
          <Animated.View
            style={[styles.result, { opacity: reveal }]}
            accessibilityLiveRegion="assertive"
          >
            <Text style={styles.resultKicker}>{play?.replayed ? 'Daha önce oynanmış' : 'Kazandığın'}</Text>
            <Text style={styles.resultLabel}>{resultText}</Text>
            {play?.prize.couponCode ? (
              <Text style={styles.meta}>Kupon kodu: {play.prize.couponCode}</Text>
            ) : null}
          </Animated.View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headCopy: { flex: 1, minWidth: 0, gap: 4 },
  kicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ash,
  },
  campaign: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.onSurface },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
  },
  badgeLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.onSurface,
  },

  stage: { alignItems: 'center', gap: space.md, paddingVertical: space.md },
  dial: {
    width: 208,
    height: 208,
    borderRadius: 104,
    borderWidth: 4,
    borderColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.surfaceLow,
  },
  dialBlocked: { opacity: 0.7 },
  dialLabel: {
    fontFamily: fonts.anton,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  prizeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  prizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  prizeChipLabel: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.ash },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  meta: { flex: 1, fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash, lineHeight: 19 },

  result: {
    gap: 4,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mustardBloom,
    backgroundColor: colors.surfaceLow,
  },
  resultKicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ash,
  },
  resultLabel: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.ok },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  blockedButton: {
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceHigh,
  },
  blockedLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ash,
  },
  touch: { minHeight: minTouch },
});