import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { radius, spacing, useAppTheme } from '@/src/theme';

export function WorkerLocationMap() {
  const { colors } = useAppTheme();

  return (
    <View style={styles.section}>
      <AppText variant="subtitle">Your location</AppText>
      <View
        style={[
          styles.placeholder,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        ]}
      >
        <AppText color={colors.textSecondary}>
          Open TaskGrid on your phone to see your location on the map.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  placeholder: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
