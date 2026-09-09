import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { EmptyState } from '@/src/components/ui/EmptyState';
import type { TaskSummary } from '@/src/features/auth/types';
import { discoveryApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function RecommendedTasks() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  useEffect(() => {
    discoveryApi
      .tasks()
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);
  return (
    <View style={styles.section}>
      <View>
        <AppText variant="subtitle">Recommended tasks</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Latest five open opportunities
        </AppText>
      </View>
      {tasks === null ? (
        <AppText color={colors.textMuted}>Finding open tasks…</AppText>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="Nothing open right now"
          description="You’re all caught up. New tasks will appear here as soon as clients post them."
        />
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => router.push('/(tabs)/tasks')}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.copy}>
                <AppText variant="bodyMedium" numberOfLines={1}>
                  {task.title}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {task.category} · {task.locationDescription}
                </AppText>
              </View>
              <AppText variant="bodyMedium" color={colors.primary}>
                {task.budget == null ? 'Open bid' : money.format(task.budget)}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { gap: spacing.sm },
  card: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
});
