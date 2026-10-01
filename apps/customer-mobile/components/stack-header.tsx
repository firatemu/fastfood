import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, hitSlop, minTouch, space } from '../theme';

export function StackHeader(props: { title: string; onBack?: () => void }): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        hitSlop={hitSlop}
        onPress={props.onBack ?? (() => router.back())}
        style={styles.back}
      >
        <MaterialCommunityIcons name="chevron-left" size={26} color={colors.onSurface} />
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
    backgroundColor: 'rgba(18,19,22,0.92)',
    zIndex: 20,
  },
  back: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginHorizontal: space.sm,
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  spacer: { width: minTouch },
});
