import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { RecommendedTaskSkeleton } from '@/src/components/ui/SkeletonLoader';
import type { TaskSummary } from '@/src/features/auth/types';
import { discoveryApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function RecommendedTasks() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      discoveryApi
        .tasks()
        .then((items) => {
          if (active) setTasks(items);
        })
        .catch(() => {
          if (active) setTasks([]);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={styles.section}>
      <View>
        <AppText variant="subtitle">Recommended tasks</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Skills lead the score, followed by distance, similar work and freshness
        </AppText>
      </View>
      {tasks === null ? (
        <RecommendedTaskSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="No close matches yet"
          description="No open task currently meets your match level. You can review it from Profile."
          action={
            <Pressable onPress={() => router.push('/task-recommendations' as never)}>
              <AppText variant="button" color={colors.primary}>
                Review match level
              </AppText>
            </Pressable>
          }
        />
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.categoryGroup}>
                  <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.categoryCopy}>
                    <AppText variant="eyebrow" color={colors.primary} numberOfLines={1}>
                      {task.category}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {task.locationDescription}
                    </AppText>
                  </View>
                </View>
                <View style={[styles.score, { backgroundColor: colors.successSoft }]}>
                  <AppText variant="caption" color={colors.success}>
                    {task.recommendationScore}% match
                  </AppText>
                </View>
              </View>

              <View style={styles.copy}>
                <AppText variant="subtitle" numberOfLines={2} style={styles.title}>
                  {task.title}
                </AppText>
                <AppText color={colors.textSecondary} numberOfLines={3} style={styles.explanation}>
                  {task.recommendationExplanation}
                </AppText>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
                <View style={styles.travelGroup}>
                  <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
                  <AppText variant="caption" color={colors.textSecondary}>
                    {task.distanceKm != null
                      ? `${task.distanceKm.toFixed(1)} km${
                          task.estimatedTravelMinutes != null
                            ? ` · about ${task.estimatedTravelMinutes} min`
                            : ''
                        }`
                      : 'Distance available with location'}
                  </AppText>
                </View>
                <View style={styles.priceGroup}>
                  <AppText variant="caption" color={colors.textMuted}>
                    Budget
                  </AppText>
                  <AppText variant="bodyMedium" color={colors.primary}>
                    {task.budget == null ? 'Not set' : money.format(task.budget)}
                  </AppText>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { gap: spacing.md },
  card: {
    minHeight: 188,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  categoryGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  categoryCopy: { flex: 1, gap: 2 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: spacing.sm },
  title: { lineHeight: 23 },
  explanation: { lineHeight: 20 },
  score: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  travelGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priceGroup: { alignItems: 'flex-end', gap: 2 },
});
