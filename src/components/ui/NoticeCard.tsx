import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { radius, spacing, useAppTheme } from '@/src/theme';

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

type NoticeCardProps = PropsWithChildren<{
  title?: string;
  tone?: NoticeTone;
  icon?: ComponentProps<typeof Ionicons>['name'];
}>;

export function NoticeCard({
  children,
  title,
  tone = 'info',
  icon = 'shield-checkmark-outline',
}: NoticeCardProps) {
  const { colors } = useAppTheme();
  const foreground = colors[tone];
  const background = colors[`${tone}Soft` as const];

  return (
    <View style={[styles.card, { backgroundColor: background, borderColor: `${foreground}30` }]}>
      <Ionicons name={icon} size={21} color={foreground} />
      <View style={styles.copy}>
        {title ? <AppText variant="bodyMedium">{title}</AppText> : null}
        <AppText variant="caption" color={colors.textSecondary}>
          {children}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  copy: { flex: 1, gap: 2 },
});
