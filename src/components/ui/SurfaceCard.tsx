import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

type SurfaceCardProps = PropsWithChildren<{ style?: ViewStyle }>;

export function SurfaceCard({ children, style }: SurfaceCardProps) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
