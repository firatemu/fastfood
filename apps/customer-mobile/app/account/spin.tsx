import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchSpin, playSpin } from '../../lib/engagement';
import { newClientRequestId, spinReasonCopy, spinResultCopy } from '../../lib/engagement-map';
import type { SpinEligibility, SpinPlay } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { colors, fonts, radius, space } from '../../theme';

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

  async function onSpin() {
    if (!state?.eligible || busy) return;
    setBusy(true);
    setError(null);
    try {
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

  const resultText = play ? spinResultCopy(play) : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.kicker}>{state.campaign?.name ?? 'Ateş Çarkı'}</Text>
        <Text style={styles.body} accessibilityLiveRegion="polite">
          {spinReasonCopy(state.reason)}
        </Text>
        {state.campaign?.endsAt ? (
          <Text style={styles.meta}>Bitiş: {formatStorefrontDateTime(state.campaign.endsAt)}</Text>
        ) : null}
        {state.prizes.length > 0 ? (
          <Text style={styles.meta}>Ödüller sunucuda tanımlı. Sonuç sunucudan gelir.</Text>
        ) : null}
        <MustardButton
          label={busy ? 'Çevriliyor…' : 'Çevir'}
          loading={busy}
          disabled={!state.eligible}
          onPress={() => void onSpin()}
        />
        {resultText ? (
          <Text style={styles.result} accessibilityLiveRegion="assertive">
            {resultText}
          </Text>
        ) : null}
        {play?.prize.couponCode ? <Text style={styles.meta}>Kupon: {play.prize.couponCode}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: space.gutter, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  kicker: { fontFamily: fonts.anton, fontSize: 32, color: colors.mustard, textTransform: 'uppercase' },
  body: { fontFamily: fonts.jakarta, fontSize: 16, color: colors.onSurface, lineHeight: 24 },
  meta: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  result: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.mustard },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
});
