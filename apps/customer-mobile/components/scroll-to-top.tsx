import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useState, type ReactElement, type RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';

import { colors, radius, space } from '../theme';

/** How far down the page has to be before the control means anything. */
export const SCROLL_TOP_THRESHOLD = 600;

export interface ScrollToTop {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  visible: boolean;
}

/**
 * Reports whether a screen has scrolled far enough for a "back to top" control
 * to be worth showing. Spread `onScroll` onto that screen's ScrollView.
 *
 * It deliberately does not hand back the ref: returning an object that contains
 * a ref makes every read of that object look like ref access during render,
 * which `react-hooks/refs` rejects. The caller owns the ref instead.
 */
export function useScrollToTop(threshold: number = SCROLL_TOP_THRESHOLD): ScrollToTop {
  const [visible, setVisible] = useState(false);

  // `onScroll` fires per frame, so the update is guarded: React bails out when
  // the updater returns the identical value, keeping the screen still.
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = event.nativeEvent.contentOffset.y > threshold;
      setVisible((prev) => (prev === next ? prev : next));
    },
    [threshold],
  );

  return { onScroll, visible };
}

export function ScrollToTopFab({
  visible,
  scrollRef,
  bottom,
}: {
  visible: boolean;
  scrollRef: RefObject<ScrollView | null>;
  /** Distance from the bottom edge; pass room for the tab bar on tab screens. */
  bottom: number;
}): ReactElement | null {
  if (!visible) return null;

  // Reading `scrollRef.current` inside the handler keeps the ref out of render.
  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sayfanın başına dön"
      onPress={scrollToTop}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name="arrow-up" size={22} color={colors.onMustard} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: space.gutter,
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mustard,
    // Lifts it above the product cards it floats over.
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: { backgroundColor: colors.mustardPressed },
});