import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../../components/form-field';
import { StackHeader } from '../../components/stack-header';
import { MustardButton } from '../../components/ui';
import { parseTableCode } from '../../lib/table-code';
import { colors, fonts, radius, space } from '../../theme';

export default function TableLookupRoute() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    const parsed = parseTableCode(code);
    if (!parsed) {
      setError('Masa kodu 3–32 karakter, harf/rakam/tire olmalı.');
      return;
    }
    setError(null);
    router.push(`/table/${parsed}`);
  }

  return (
    <View style={styles.screen}>
      <StackHeader title="Masa kodu" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.body}>
            Masa kodu giriş yapmaz ve gel-al / teslimat seçimini değiştirmez. Kamera izni yalnızca tarayıcı
            açılınca istenir. `fastfoodcustomer://table/KOD` bağlantısı da çalışır.
          </Text>
          <MustardButton label="Kamerayla tara" onPress={() => router.push('/table/scan')} />
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
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
});
