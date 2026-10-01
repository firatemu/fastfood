import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from './card.js';
import { Money } from './money.js';
import type { NativeTheme } from './theme.js';

export interface ProductCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  priceMinor: string | number | bigint;
  currency?: string;
  onAdd?: () => void;
  addLabel?: string;
  theme: NativeTheme;
}

export function ProductCard(props: ProductCardProps) {
  const {
    title,
    description,
    imageUrl,
    priceMinor,
    currency,
    onAdd,
    addLabel = 'Sepete ekle',
    theme,
  } = props;
  const styles = createStyles(theme);
  return (
    <Card
      title={title}
      subtitle={description}
      elevation="raised"
      footer={
        <View style={styles.footer}>
          <Money amountMinor={priceMinor} currency={currency} theme={theme} />
          {onAdd ? (
            <Pressable
              onPress={onAdd}
              accessibilityRole="button"
              accessibilityLabel={addLabel}
              style={({ pressed }) => [styles.addBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.addLabel}>{addLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      }
      theme={theme}
    >
      {imageUrl ? (
        <View accessibilityElementsHidden importantForAccessibility="no" style={styles.image}>
          {/* Real RN apps swap for <Image source={{uri: imageUrl}} /> */}
        </View>
      ) : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.image, styles.imagePlaceholder]}
        />
      )}
    </Card>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    image: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: theme.color.neutral[100],
    },
    imagePlaceholder: {
      backgroundColor: theme.tokens.surfaceSubtle,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.space[2],
    },
    addBtn: {
      backgroundColor: theme.tokens.actionPrimaryBackground,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
      borderRadius: theme.radius.md,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pressed: { opacity: 0.85 },
    addLabel: {
      color: theme.tokens.actionPrimaryText,
      fontSize: theme.fontSize.sm.size,
      fontWeight: '600',
    },
  });
}
