import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import type { UserRole } from '@/src/features/auth/types';
import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

export function TaskGridAssistantCard({ role, onPress }: { role: UserRole; onPress(): void }) {
  const { isDark } = useAppTheme();
  const worker = role === 'RUNNER';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open TaskGrid Guide"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
    >
      <LinearGradient
        colors={isDark ? ['#171D3E', '#292B72'] : ['#EEF0FF', '#DDE1FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadows.card]}
      >
        <View style={styles.largeOrb} />
        <View style={styles.smallOrb} />
        <AppText variant="eyebrow" color={isDark ? '#B8BAFF' : '#4547C9'}>
          TASKGRID GUIDE
        </AppText>
        <View style={styles.copy}>
          <AppText variant="subtitle">
            {worker ? 'Need a hand with your next job?' : 'Not sure what to do next?'}
          </AppText>
          <AppText color={isDark ? '#C9CDE0' : '#4C5870'}>
            {worker
              ? 'Ask about nearby tasks, journeys, payouts or staying safe.'
              : 'Ask about posting, payments, choosing workers or task safety.'}
          </AppText>
        </View>
        <View style={styles.cta}>
          <AppText variant="button" color={isDark ? '#DCDDFF' : '#3436A7'}>
            Ask TaskGrid
          </AppText>
          <Ionicons name="arrow-forward" size={18} color={isDark ? '#DCDDFF' : '#3436A7'} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 190,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  copy: { maxWidth: '82%', gap: spacing.sm },
  cta: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  largeOrb: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -62,
    top: -58,
    backgroundColor: 'rgba(85,87,232,0.15)',
  },
  smallOrb: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    right: 38,
    bottom: 24,
    borderWidth: 10,
    borderColor: 'rgba(85,87,232,0.18)',
  },
});
