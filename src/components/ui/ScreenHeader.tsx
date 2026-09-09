import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { spacing, useAppTheme } from '@/src/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function ScreenHeader({ title, subtitle, eyebrow, action }: ScreenHeaderProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? (
          <AppText variant="eyebrow" color={colors.primary}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title">{title}</AppText>
        <AppText color={colors.textSecondary}>{subtitle}</AppText>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  copy: { flex: 1, gap: spacing.xs },
});
