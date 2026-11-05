import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../lib/haptics';
import { colors, fonts, hitSlop, minTouch, radius, space } from '../theme';

export function StackHeader(props: { title: string; onBack?: () => void }): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        hitSlop={hitSlop}
        onPress={() => {
          haptic.light();
          if (props.onBack) props.onBack();
          else router.back();
        }}
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {props.title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingBottom: space.sm,
    backgroundColor: 'rgba(15, 16, 20, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    zIndex: 20,
  },
  back: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    backgroundColor: colors.surfaceHigh,
    transform: [{ scale: 0.92 }],
  },
  title: {
    flex: 1,
    marginHorizontal: space.sm,
    fontFamily: fonts.anton,
    fontSize: 20,
    color: colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: { width: minTouch },
});
