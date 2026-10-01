import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { VitrineProduct } from '../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../theme';

import { HomeHeroCard } from './home-hero';

export function HomeHeroSlider(props: {
  products: VitrineProduct[];
  busyId: string | null;
  onAdd: (productId: string) => void;
  transitionDurationSeconds: number;
  loop: boolean;
}) {
  const { width } = useWindowDimensions();
  const slideWidth = Math.max(width - space.gutter * 2, 1);
  const pagerRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const safeIndex = Math.max(0, Math.min(index, props.products.length - 1));
      setActiveIndex(safeIndex);
      pagerRef.current?.scrollTo({ x: safeIndex * slideWidth, animated: true });
    },
    [props.products.length, slideWidth],
  );

  useEffect(() => {
    if (
      props.products.length < 2 ||
      reducedMotion ||
      (!props.loop && activeIndex >= props.products.length - 1)
    ) {
      return;
    }
    const timer = setTimeout(() => {
      const nextIndex = activeIndex >= props.products.length - 1 ? 0 : activeIndex + 1;
      goTo(nextIndex);
    }, props.transitionDurationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [
    activeIndex,
    goTo,
    props.loop,
    props.products.length,
    props.transitionDurationSeconds,
    reducedMotion,
  ]);

  if (props.products.length === 0) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        directionalLockEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
          setActiveIndex(Math.max(0, Math.min(nextIndex, props.products.length - 1)));
        }}
        accessibilityLabel="Vitrin ürünleri. Yana kaydırarak ürünler arasında gezinin."
      >
        {props.products.map((product) => (
          <View key={product.id} style={{ width: slideWidth }}>
            <HomeHeroCard
              product={product}
              busy={props.busyId === product.id}
              onAdd={() => props.onAdd(product.id)}
            />
          </View>
        ))}
      </ScrollView>

      {props.products.length > 1 ? (
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Önceki vitrin ürünü"
            disabled={!props.loop && activeIndex === 0}
            onPress={() =>
              goTo(activeIndex > 0 ? activeIndex - 1 : props.loop ? props.products.length - 1 : 0)
            }
            style={({ pressed }) => [
              styles.arrow,
              pressed && styles.pressed,
              !props.loop && activeIndex === 0 && styles.disabled,
            ]}
          >
            <MaterialCommunityIcons name="chevron-left" size={21} color={colors.onSurface} />
          </Pressable>
          <View style={styles.centerControls}>
            <View
              style={styles.dots}
              accessibilityRole="tablist"
              accessibilityLabel="Vitrin slaytları"
            >
              {props.products.map((product, index) => (
                <Pressable
                  key={product.id}
                  accessibilityRole="tab"
                  accessibilityLabel={`${index + 1}. slayt: ${product.name}`}
                  accessibilityState={{ selected: index === activeIndex }}
                  hitSlop={8}
                  onPress={() => goTo(index)}
                  style={[styles.dot, index === activeIndex && styles.activeDot]}
                />
              ))}
            </View>
            <Text style={styles.counter}>
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(props.products.length).padStart(2, '0')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sonraki vitrin ürünü"
            disabled={!props.loop && activeIndex === props.products.length - 1}
            onPress={() =>
              goTo(
                activeIndex < props.products.length - 1
                  ? activeIndex + 1
                  : props.loop
                    ? 0
                    : activeIndex,
              )
            }
            style={({ pressed }) => [
              styles.arrow,
              pressed && styles.pressed,
              !props.loop && activeIndex === props.products.length - 1 && styles.disabled,
            ]}
          >
            <MaterialCommunityIcons name="chevron-right" size={21} color={colors.onSurface} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: {
    width: minTouch,
    height: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceLow,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  centerControls: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.surfaceHighest },
  activeDot: { width: 24, backgroundColor: colors.mustard },
  counter: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
