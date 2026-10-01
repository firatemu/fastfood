import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, minTouch, space } from '../theme';

export function NavRow(props: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
  danger?: boolean;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : 'text'}
      accessibilityState={{ disabled: !props.onPress }}
      disabled={!props.onPress}
      onPress={props.onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={props.icon}
          size={20}
          color={props.danger ? colors.error : colors.mustard}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, props.danger && styles.danger]}>{props.title}</Text>
        {props.subtitle ? <Text style={styles.sub}>{props.subtitle}</Text> : null}
      </View>
      {props.badge ? <Text style={styles.badge}>{props.badge}</Text> : null}
      {props.onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={colors.outline} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceHigh },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.jakartaSemibold,
    fontSize: 14,
    color: colors.onSurface,
  },
  danger: { color: colors.error },
  sub: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.ash,
    marginTop: 2,
  },
  badge: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.mustard,
    backgroundColor: colors.surfaceHighest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
