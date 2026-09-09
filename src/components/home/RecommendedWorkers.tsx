import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { EmptyState } from '@/src/components/ui/EmptyState';
import type { WorkerSummary } from '@/src/features/auth/types';
import { discoveryApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

export function RecommendedWorkers() {
  const { colors } = useAppTheme();
  const [workers, setWorkers] = useState<WorkerSummary[] | null>(null);
  useEffect(() => {
    discoveryApi
      .workers()
      .then(setWorkers)
      .catch(() => setWorkers([]));
  }, []);
  return (
    <View style={styles.section}>
      <View>
        <AppText variant="subtitle">Recommended workers</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Recently joined active workers
        </AppText>
      </View>
      {workers === null ? (
        <AppText color={colors.textMuted}>Loading workers…</AppText>
      ) : workers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No workers available yet"
          description="Verified workers will appear here as they join TaskGrid."
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {workers.map((worker) => (
            <View
              key={worker.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Avatar name={worker.fullName} uri={worker.profilePictureUrl} size={54} />
              <View style={styles.copy}>
                <AppText variant="bodyMedium" numberOfLines={1}>
                  {worker.fullName}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {worker.primarySkillName ?? 'General services'}
                </AppText>
              </View>
              <View style={styles.meta}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <AppText variant="caption">
                  {worker.averageRating && worker.totalJobs > 0
                    ? Number(worker.averageRating).toFixed(1)
                    : 'New'}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  row: { gap: spacing.md, paddingRight: spacing.xl },
  card: {
    width: 154,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  copy: { gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
