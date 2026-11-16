import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts } from '../theme';

export function BurgerSplashIntro(props: {
  isReady: boolean;
  onFinish: () => void;
}) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Layer translations
  const [topBunY] = useState(() => new Animated.Value(-120));
  const [tomatoY] = useState(() => new Animated.Value(-90));
  const [lettuceY] = useState(() => new Animated.Value(-70));
  const [cheeseY] = useState(() => new Animated.Value(-50));
  const [pattyY] = useState(() => new Animated.Value(-35));
  const [bottomBunScale] = useState(() => new Animated.Value(0.3));

  // Impact and text animations
  const [burgerScale] = useState(() => new Animated.Value(1));
  const [steamOpacity] = useState(() => new Animated.Value(0));
  const [steamY] = useState(() => new Animated.Value(0));
  const [textOpacity] = useState(() => new Animated.Value(0));
  const [textY] = useState(() => new Animated.Value(16));

  // Master fadeout
  const [containerOpacity] = useState(() => new Animated.Value(1));
  const exitingRef = useRef(false);

  useEffect(() => {
    // 1. Staggered drop & spring assembly
    Animated.parallel([
      Animated.spring(bottomBunScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(pattyY, {
          toValue: 0,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(160),
        Animated.spring(cheeseY, {
          toValue: 0,
          friction: 6,
          tension: 95,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(240),
        Animated.spring(lettuceY, {
          toValue: 0,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(320),
        Animated.spring(tomatoY, {
          toValue: 0,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.spring(topBunY, {
          toValue: 0,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. Squash & bounce upon full burger stack completion (~650ms)
    const timer1 = setTimeout(() => {
      Animated.sequence([
        Animated.timing(burgerScale, {
          toValue: 1.1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(burgerScale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();

      // Steam & Brand title reveal
      Animated.parallel([
        Animated.timing(steamOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(steamY, {
          toValue: -12,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(textY, {
          toValue: 0,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }, 650);

    // 3. Minimum presentation duration (~1250ms total)
    const timer2 = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1250);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [
    bottomBunScale,
    burgerScale,
    cheeseY,
    lettuceY,
    pattyY,
    steamOpacity,
    steamY,
    textOpacity,
    textY,
    tomatoY,
    topBunY,
  ]);

  // Smooth fadeout once both minimum animation duration has passed and app is ready
  useEffect(() => {
    if (minTimeElapsed && props.isReady && !exitingRef.current) {
      exitingRef.current = true;
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        props.onFinish();
      });
    }
  }, [minTimeElapsed, props.isReady, props, containerOpacity]);

  const handleSkip = () => {
    if (props.isReady && !exitingRef.current) {
      exitingRef.current = true;
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        props.onFinish();
      });
    }
  };

  return (
    <Animated.View
      style={[styles.overlay, { opacity: containerOpacity }]}
      pointerEvents={minTimeElapsed && props.isReady ? 'none' : 'auto'}
    >
      <Pressable style={styles.content} onPress={handleSkip} testID="burger-splash-pressable">
        {/* Warm ambient glow */}
        <View style={styles.ambientGlow} />

        {/* Animated Burger Container */}
        <Animated.View
          style={[styles.burgerContainer, { transform: [{ scale: burgerScale }] }]}
        >
          {/* Steam wisps */}
          <Animated.View
            style={[
              styles.steamContainer,
              { opacity: steamOpacity, transform: [{ translateY: steamY }] },
            ]}
          >
            <View style={[styles.steamWisp, styles.steamWisp1]} />
            <View style={[styles.steamWisp, styles.steamWisp2]} />
            <View style={[styles.steamWisp, styles.steamWisp3]} />
          </Animated.View>

          {/* 1. Top Bun with Sesame Seeds */}
          <Animated.View
            style={[styles.topBun, { transform: [{ translateY: topBunY }] }]}
          >
            <View style={[styles.sesame, styles.sesame1]} />
            <View style={[styles.sesame, styles.sesame2]} />
            <View style={[styles.sesame, styles.sesame3]} />
            <View style={[styles.sesame, styles.sesame4]} />
            <View style={[styles.sesame, styles.sesame5]} />
          </Animated.View>

          {/* 2. Sliced Tomatoes */}
          <Animated.View
            style={[styles.tomatoRow, { transform: [{ translateY: tomatoY }] }]}
          >
            <View style={styles.tomatoSlice} />
            <View style={styles.tomatoSlice} />
          </Animated.View>

          {/* 3. Crispy Wavy Lettuce */}
          <Animated.View
            style={[styles.lettuce, { transform: [{ translateY: lettuceY }] }]}
          >
            <View style={styles.lettuceFrill1} />
            <View style={styles.lettuceFrill2} />
            <View style={styles.lettuceFrill3} />
            <View style={styles.lettuceFrill4} />
          </Animated.View>

          {/* 4. Melted Cheddar Cheese */}
          <Animated.View
            style={[styles.cheeseContainer, { transform: [{ translateY: cheeseY }] }]}
          >
            <View style={styles.cheeseSlice} />
            <View style={styles.cheeseMeltCorner} />
          </Animated.View>

          {/* 5. Flame-Grilled Beef Patty */}
          <Animated.View
            style={[styles.patty, { transform: [{ translateY: pattyY }] }]}
          >
            <View style={styles.grillLine} />
            <View style={styles.grillLine} />
          </Animated.View>

          {/* 6. Golden Bottom Bun */}
          <Animated.View
            style={[styles.bottomBun, { transform: [{ scale: bottomBunScale }] }]}
          />
        </Animated.View>

        {/* Brand Text Reveal */}
        <Animated.View
          style={[
            styles.brandBlock,
            { opacity: textOpacity, transform: [{ translateY: textY }] },
          ]}
        >
          <Text style={styles.brandTitle}>BURGER HOME</Text>
          <Text style={styles.brandSubtitle}>ATEŞLE PİŞİRİLDİ</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.canvas,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(254, 179, 0, 0.09)',
  },
  burgerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  steamContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    height: 16,
    alignItems: 'flex-end',
  },
  steamWisp: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  steamWisp1: {
    height: 10,
    transform: [{ rotate: '-12deg' }],
  },
  steamWisp2: {
    height: 15,
  },
  steamWisp3: {
    height: 11,
    transform: [{ rotate: '12deg' }],
  },
  topBun: {
    width: 112,
    height: 42,
    backgroundColor: '#f59e0b',
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d97706',
  },
  sesame: {
    position: 'absolute',
    width: 5,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fef3c7',
  },
  sesame1: { top: 12, left: 26, transform: [{ rotate: '-20deg' }] },
  sesame2: { top: 8, left: 52, transform: [{ rotate: '5deg' }] },
  sesame3: { top: 14, right: 28, transform: [{ rotate: '25deg' }] },
  sesame4: { top: 22, left: 40, transform: [{ rotate: '-10deg' }] },
  sesame5: { top: 21, right: 42, transform: [{ rotate: '15deg' }] },

  tomatoRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -2,
    zIndex: 2,
  },
  tomatoSlice: {
    width: 50,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },

  lettuce: {
    width: 118,
    height: 12,
    backgroundColor: '#10b981',
    borderRadius: 6,
    marginTop: -1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    zIndex: 3,
  },
  lettuceFrill1: {
    width: 22,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
    marginTop: 2,
  },
  lettuceFrill2: {
    width: 26,
    height: 11,
    borderRadius: 5,
    backgroundColor: '#34d399',
    marginTop: 1,
  },
  lettuceFrill3: {
    width: 24,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
    marginTop: 2,
  },
  lettuceFrill4: {
    width: 22,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34d399',
    marginTop: 1,
  },

  cheeseContainer: {
    width: 116,
    marginTop: -1,
    zIndex: 4,
  },
  cheeseSlice: {
    width: '100%',
    height: 11,
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  cheeseMeltCorner: {
    position: 'absolute',
    right: 20,
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: '#fbbf24',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },

  patty: {
    width: 114,
    height: 22,
    backgroundColor: '#451a03',
    borderRadius: 11,
    marginTop: -1,
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#291104',
    zIndex: 1,
  },
  grillLine: {
    height: 2,
    backgroundColor: '#1c0a02',
    borderRadius: 1,
  },

  bottomBun: {
    width: 106,
    height: 22,
    backgroundColor: '#d97706',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    marginTop: -2,
    borderWidth: 1,
    borderColor: '#b45309',
  },

  brandBlock: {
    marginTop: 24,
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: fonts.anton,
    fontSize: 26,
    color: colors.mustard,
    letterSpacing: 2.5,
  },
  brandSubtitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 3,
    marginTop: 4,
  },
});
