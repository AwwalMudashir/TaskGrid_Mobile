import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { RecommendedWorkerSkeleton } from '@/src/components/ui/SkeletonLoader';
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
        <RecommendedWorkerSkeleton />
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
          {workers.map((worker) => {
            const skillNames = worker.skillNames?.length
              ? worker.skillNames
              : worker.primarySkillName
                ? [worker.primarySkillName]
                : [];
            return (
              <View
                key={worker.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
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
                {skillNames.length > 1 ? (
                  <View style={styles.skills}>
                    {skillNames.slice(1, 3).map((skill) => (
                      <View
                        key={skill}
                        style={[styles.skillChip, { backgroundColor: colors.primarySoft }]}
                      >
                        <AppText variant="caption" color={colors.primary} numberOfLines={1}>
                          {skill}
                        </AppText>
                      </View>
                    ))}
                    {skillNames.length > 3 ? (
                      <AppText variant="caption" color={colors.textMuted}>
                        +{skillNames.length - 3} more
                      </AppText>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.meta}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <AppText variant="caption">
                    {worker.reviewCount > 0 && worker.averageRating
                      ? `${Number(worker.averageRating).toFixed(1)} · ${worker.reviewCount} ${worker.reviewCount === 1 ? 'review' : 'reviews'}`
                      : 'No reviews yet'}
                  </AppText>
                </View>
                {worker.identityVerified ? (
                  <View style={styles.meta}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                    <AppText variant="caption" color={colors.success}>
                      Identity verified
                    </AppText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  row: { gap: spacing.md, paddingRight: spacing.xl },
  card: {
    width: 184,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  copy: { gap: 2 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: {
    maxWidth: 116,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
