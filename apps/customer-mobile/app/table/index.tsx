import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../../components/form-field';
import { StackHeader } from '../../components/stack-header';
import { MustardButton } from '../../components/ui';
import { haptic } from '../../lib/haptics';
import { parseTableCode } from '../../lib/table-code';
import { colors, fonts, radius, space } from '../../theme';

export default function TableLookupRoute() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    haptic.light();
    const parsed = parseTableCode(code);
    if (!parsed) {
      haptic.warning();
      setError('Masa kodu 3–32 karakter, harf/rakam/tire olmalı.');
      return;
    }
    setError(null);
    router.push(`/table/${parsed}`);
  }

  return (
    <View style={styles.screen}>
      <StackHeader title="Masa Kodu" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.scanCard, pressed && styles.scanCardPressed]}
            onPress={() => {
              haptic.light();
              router.push('/table/scan');
            }}
          >
            <View style={styles.scanIconWrap}>
              <MaterialCommunityIcons name="qrcode-scan" size={28} color={colors.mustard} />
            </View>
            <View style={styles.scanCopy}>
              <Text style={styles.scanTitle}>Kamerayla Tara</Text>
              <Text style={styles.scanSub}>Masadaki karekodu kameranla okut</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.ash} />
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VEYA ELLE GİR</Text>
            <View style={styles.dividerLine} />
          </View>

          <FormField
            label="Masa kodu"
            value={code}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Masa kodu"
            onChangeText={(next) => {
              setCode(next);
              setError(null);
            }}
            error={error ?? undefined}
          />
          <MustardButton label="Masa bağla" onPress={onSubmit} />

          <Text style={styles.body}>
            Masa kodu giriş yapmaz ve gel-al / teslimat seçimini değiştirmez. Kamera izni yalnızca
            tarayıcı açılınca istenir.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: space.gutter },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.md,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.mustardGlowSoft,
  },
  scanCardPressed: {
    backgroundColor: colors.surfaceHighest,
  },
  scanIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(254,179,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCopy: { flex: 1 },
  scanTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  scanSub: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.ash,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  dividerText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.outline,
  },
  body: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.ash,
    lineHeight: 18,
    textAlign: 'center',
  },
});
