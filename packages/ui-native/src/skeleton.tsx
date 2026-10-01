import { StyleSheet, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface SkeletonProps {
  widthUnits?: number;
  heightUnits?: number;
  circle?: boolean;
  testID?: string;
  theme: NativeTheme;
}

export function Skeleton(props: SkeletonProps) {
  const { widthUnits = 16, heightUnits = 2, circle = false, testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.base,
        {
          width: widthUnits * theme.space[1],
          height: heightUnits * theme.space[1],
          borderRadius: circle ? 9999 : theme.radius.sm,
        },
      ]}
    />
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: { backgroundColor: theme.tokens.surfaceSubtle },
  });
}
