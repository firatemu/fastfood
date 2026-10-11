import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import type { homeReviewSchema } from '../lib/schemas';
import { formatRatingBps, formatRelativeTr, starRow } from '../lib/social-proof';
import { colors, radius, space, type } from '../theme';

type Review = z.infer<typeof homeReviewSchema>;

export interface HomeReviewsProps {
  reviews: Review[];
  averageRatingBps: number | null;
  reviewCount?: number;
}

/**
 * MİSAFİRLERİMİZİN SÖZLERİ — customer social proof.
 *
 * Parity with the storefront web home (`components/storefront/home-reviews.tsx`),
 * which renders the same `socialProof.averageRatingBps` + `reviews[]` fields from
 * the `/storefront/home` payload. The data was already fetched and validated on
 * mobile but never rendered.
 *
 * Layout differs by design: the web three-column grid becomes a horizontal snap
 * carousel, which is the native equivalent at phone width.
 */
export function HomeReviews({ reviews, averageRatingBps, reviewCount }: HomeReviewsProps) {
  const rating = formatRatingBps(averageRatingBps);

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>GERÇEK DENEYİMLER</Text>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>MİSAFİRLERİMİZİN SÖZLERİ</Text>
        {rating ? (
          <View style={styles.ratingRow} accessibilityLabel={`Ortalama puan ${rating} / 5`}>
            <Text style={styles.stars}>{starRow(Number(averageRatingBps ?? 0) / 100)}</Text>
            <Text style={styles.ratingValue}>
              {rating} / 5.0
            </Text>
          </View>
        ) : null}
      </View>

      {reviews.length === 0 ? (
        <Text style={styles.empty}>Henüz yayımlanmış yorum yok.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {reviews.map((review) => (
            <View key={review.id} style={styles.card} accessibilityRole="summary">
              <Text style={styles.cardStars}>{starRow(review.rating)}</Text>
              <Text style={styles.body}>“{review.body}”</Text>
              <View style={styles.authorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{review.authorInitials}</Text>
                </View>
                <View style={styles.authorText}>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {review.authorDisplayName}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[review.branchLabel, formatRelativeTr(review.publishedAt)]
                      .filter(Boolean)
                      .join(' • ')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {reviewCount !== undefined && reviewCount > 0 ? (
        <Text style={styles.count}>{reviewCount} değerlendirme</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, paddingHorizontal: space.gutter, paddingVertical: space.lg },
  eyebrow: { ...type.labelSm, color: colors.mustard, textTransform: 'uppercase' },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  heading: { ...type.headlineLg, color: colors.onSurface, flexShrink: 1 },
  ratingRow: { alignItems: 'flex-end', gap: 2 },
  stars: { color: colors.mustard, fontSize: 12, letterSpacing: 1 },
  ratingValue: { ...type.headlineSm, color: colors.onSurface },
  empty: { ...type.bodyMd, color: colors.onSurfaceVariant, paddingVertical: space.md },
  rail: { gap: space.md, paddingVertical: space.sm, paddingRight: space.gutter },
  card: {
    width: 268,
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  cardStars: { color: colors.mustard, fontSize: 13, letterSpacing: 1 },
  body: { ...type.bodyMd, color: colors.onSurface },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.xs },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  avatarText: { ...type.headlineMd, color: colors.mustard },
  authorText: { flex: 1 },
  authorName: { ...type.labelLg, color: colors.onSurface },
  meta: { ...type.bodySm, color: colors.onSurfaceVariant, fontSize: 12 },
  count: { ...type.bodySm, color: colors.onSurfaceVariant },
});