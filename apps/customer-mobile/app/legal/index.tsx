import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StackHeader } from '../../components/stack-header';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchPublishedContent } from '../../lib/content';
import { legalDocuments } from '../../lib/content-map';
import { getStorefrontUrl } from '../../lib/env';
import type { StorefrontContent } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function LegalRoute() {
  const router = useRouter();
  const [docs, setDocs] = useState<StorefrontContent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    void fetchPublishedContent()
      .then((next) => {
        setDocs(legalDocuments(next));
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

  return (
    <View style={styles.screen}>
      <StackHeader title="Yasal" />
      {status === 'loading' ? <LoadingBlock label="Yasal metinler yükleniyor…" /> : null}
      {status === 'error' ? (
        <View style={styles.padded}>
          <ErrorBlock title="İçerik yüklenemedi" message={error ?? ''} onRetry={load} />
        </View>
      ) : null}
      {status === 'ready' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.lede}>
            Metinler içerik kayıtlarından gelir. Kayıtlı olmayan sicil bilgisi (VKN, MERSIS) uydurulmaz.
          </Text>
          {docs.length === 0 ? (
            <EmptyBlock title="Yayınlanmış metin yok" message="Yasal içerik henüz tanımlanmamış." />
          ) : (
            docs.map((doc) => (
              <View key={doc.slug} style={styles.card}>
                <Text style={styles.title} accessibilityRole="header">
                  {doc.title}
                </Text>
                {doc.effectiveAt ? (
                  <Text style={styles.meta}>Yürürlük: {new Date(doc.effectiveAt).toLocaleDateString('tr-TR')}</Text>
                ) : null}
                <Text style={styles.body}>{doc.body}</Text>
                {doc.sections.map((section) => (
                  <View key={section.id} style={styles.section}>
                    <Text style={styles.heading} accessibilityRole="header">
                      {section.heading}
                    </Text>
                    <Text style={styles.body}>{section.body}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`${getStorefrontUrl()}/gizlilik`)}
            style={styles.guide}
          >
            <Text style={styles.title}>Gizlilik politikası</Text>
            <Text style={styles.body}>Topladığımız veriler, izinler ve hakların.</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`${getStorefrontUrl()}/hesap-silme`)}
            style={styles.guide}
          >
            <Text style={styles.title}>Hesap silme</Text>
            <Text style={styles.body}>Hesabını ve kişisel verilerini silme adımları.</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/legal/allergens')}
            style={styles.guide}
          >
            <Text style={styles.title}>Alerjen rehberi</Text>
            <Text style={styles.body}>Katalog sözlüğü ve çapraz bulaşma uyarısı.</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  lede: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  guide: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    minHeight: minTouch,
  },
  title: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.onSurface, textTransform: 'uppercase' },
  heading: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  meta: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  section: { gap: 4, marginTop: 4 },
});
