import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { radius, spacing, useAppTheme } from '@/src/theme';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    icon: ComponentProps<typeof Ionicons>['name'];
    accessibilityLabel: string;
    onPress: () => void;
    color?: string;
  };
};

export function AuthHeader({
  title,
  subtitle,
  back = true,
  onBackPress,
  rightAction,
}: AuthHeaderProps) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBackPress ?? (() => router.back())}
          style={[styles.icon, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.brandDark} />
        </Pressable>
      ) : null}
      <View style={styles.copy}>
        <AppText variant="subtitle">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={rightAction.accessibilityLabel}
          hitSlop={8}
          onPress={rightAction.onPress}
          style={({ pressed }) => [
            styles.rightAction,
            {
              backgroundColor: `${rightAction.color ?? colors.textSecondary}12`,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons
            name={rightAction.icon}
            size={22}
            color={rightAction.color ?? colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  copy: { flex: 1 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
