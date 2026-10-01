import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { EmptyBlock, ErrorBlock, LoadingBlock, MustardButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchClub } from '../../lib/engagement';
import {
  clubActivityLabel,
  clubProgressPercent,
  welcomeRewardCopy,
} from '../../lib/engagement-map';
import { cacheClub } from '../../lib/private-cache';
import type { ClubSnapshot } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { colors, fonts, radius, space } from '../../theme';

export default function AccountClubRoute() {
  return (
    <View style={styles.screen}>
      <StackHeader title="BURGER HOME CLUB" />
      <RequireCustomer next="/account/club">
        <ClubBody />
      </RequireCustomer>
    </View>
  );
}

function ClubBody() {
  const router = useRouter();
  const [club, setClub] = useState<ClubSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    void fetchClub()
      .then((next) => {
        setClub(next);
        cacheClub(next);
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

  if (status === 'loading') return <LoadingBlock label="CLUB yükleniyor…" />;
  if (status === 'error' || !club) {
    return <ErrorBlock title="CLUB yüklenemedi" message={error ?? ''} onRetry={load} />;
  }

  const progress = clubProgressPercent(club.progressBps);
  const welcome = welcomeRewardCopy(club.welcome.status, club.welcome.promotionCode);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.kicker}>{club.programName}</Text>
        <Text style={styles.points}>{club.points} puan</Text>
        <Text style={styles.meta}>Kullanılabilir bakiye · kademe ayrı hesaplanır</Text>
        <Text style={styles.tier}>{club.currentTier.displayName}</Text>
        <Text style={styles.meta}>Ömür boyu kazanılan: {club.lifetimeEarnedPoints}</Text>
        {club.nextTier ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressRow}>
              <Text style={styles.meta}>Sonraki: {club.nextTier.displayName}</Text>
              <Text style={styles.meta}>{club.pointsToNextTier} puan</Text>
            </View>
            <View style={styles.bar} accessibilityLabel={`İlerleme yüzde ${progress}`}>
              <View style={[styles.barFill, { width: `${progress}%` }]} />
            </View>
          </View>
        ) : (
          <Text style={styles.body}>En üst seviye.</Text>
        )}
        {welcome ? <Text style={styles.welcome}>{welcome}</Text> : null}
        <MustardButton label="Ateş Çarkı" onPress={() => router.push('/account/spin')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Hareketler</Text>
        {club.activity.length === 0 ? (
          <EmptyBlock title="Henüz hareket yok" message="Sipariş ve çark puanları burada görünür." />
        ) : (
          club.activity.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.body}>{clubActivityLabel(row.reason, row.entryType)}</Text>
                <Text style={styles.meta}>{formatStorefrontDateTime(row.createdAt)}</Text>
              </View>
              <Text style={styles.delta}>{row.pointsDelta}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  kicker: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.mustard, textTransform: 'uppercase' },
  points: { fontFamily: fonts.anton, fontSize: 40, color: colors.onSurface },
  tier: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.onSurface },
  meta: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  welcome: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.mustard, lineHeight: 20 },
  progressWrap: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHighest, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.mustard },
  section: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  copy: { flex: 1 },
  delta: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.mustard },
});
