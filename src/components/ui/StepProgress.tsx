import { StyleSheet, View } from 'react-native';

import { radius, spacing, useAppTheme } from '@/src/theme';

export function StepProgress({ current, total }: { current: number; total: number }) {
  const { colors } = useAppTheme();
  return (
    <View accessibilityLabel={`Step ${current} of ${total}`} style={styles.row}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.step,
            { backgroundColor: index < current ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  step: { flex: 1, height: 5, borderRadius: radius.pill },
});
