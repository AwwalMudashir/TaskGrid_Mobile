import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { SkeletonBlock } from '@/src/components/ui/SkeletonLoader';
import type { WorkerProfile } from '@/src/features/auth/types';
import { taskApi, type ReceivedReviewPage, type TaskReview } from '@/src/features/tasks/task-api';
import { ApiError, profileApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const emptyReviews: ReceivedReviewPage = {
  averageRating: 0,
  reviewCount: 0,
  items: [],
  page: 0,
  hasNext: false,
};

const identityLabels: Record<WorkerProfile['identityStatus'], string> = {
  UNVERIFIED: 'Not started',
  PENDING: 'In progress',
  VERIFIED: 'Identity verified',
  REJECTED: 'Needs another attempt',
  APPEALING: 'Appeal under review',
  SUSPENDED: 'Needs support review',
};

export default function WorkerProfileScreen() {
  const { colors } = useAppTheme();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<ReceivedReviewPage>(emptyReviews);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setReviewError('');
    try {
      const nextProfile = await profileApi.worker();
      setProfile(nextProfile);
      try {
        setReviews(await taskApi.receivedReviews());
      } catch (cause) {
        setReviewError(
          cause instanceof ApiError ? cause.message : "We couldn't load your reviews. Try again.",
        );
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't load your worker profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!reviews.hasNext || loadingMore) return;
    setLoadingMore(true);
    setReviewError('');
    try {
      const next = await taskApi.receivedReviews(reviews.page + 1);
      setReviews((current) => ({
        ...next,
        items: [
          ...current.items,
          ...next.items.filter(
            (item) => !current.items.some((currentItem) => currentItem.id === item.id),
          ),
        ],
      }));
    } catch (cause) {
      setReviewError(cause instanceof ApiError ? cause.message : "We couldn't load more reviews.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reviews.hasNext, reviews.page]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen contentStyle={styles.screen}>
      <AuthHeader title="Worker profile" subtitle="Your reputation and public trust signals" />

      {loading ? (
        <ProfileSkeleton />
      ) : !profile ? (
        <View style={styles.state}>
          <View style={[styles.stateMark, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
          </View>
          <AppText variant="subtitle">Profile unavailable</AppText>
          <AppText color={colors.textMuted} style={styles.centerText}>
            {error || "We couldn't load your worker profile."}
          </AppText>
          <Button label="Try again" variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <>
          <AnimatedEntrance>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTop}>
                <Avatar name={profile.fullName} uri={profile.profilePictureUrl} size={82} />
                <View style={styles.heroIdentity}>
                  <AppText variant="title" color="#FFFFFF">
                    {profile.fullName}
                  </AppText>
                  <AppText color="#FFFFFFD1">
                    {profile.primarySkillName ?? 'TaskGrid worker'}
                  </AppText>
                  <View style={styles.activeSignal}>
                    <View style={styles.activeDot} />
                    <AppText variant="caption" color="#FFFFFF">
                      {profile.active ? 'Profile active' : 'Profile unavailable'}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.metrics}>
                <Metric
                  value={profile.reviewCount > 0 ? profile.averageRating.toFixed(1) : '—'}
                  label="Rating"
                />
                <View style={styles.metricDivider} />
                <Metric value={String(profile.reviewCount)} label="Reviews" />
                <View style={styles.metricDivider} />
                <Metric value={String(profile.completedJobs)} label="Jobs done" />
              </View>
            </LinearGradient>
          </AnimatedEntrance>

          <AnimatedEntrance delay={70} style={styles.section}>
            <View>
              <AppText variant="subtitle">Skills</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Abilities clients can consider when reviewing your application
              </AppText>
            </View>
            {profile.skillNames.length > 0 ? (
              <View style={styles.skills}>
                {profile.skillNames.map((skill) => (
                  <View key={skill} style={[styles.skill, { backgroundColor: colors.primarySoft }]}>
                    <AppText variant="caption" color={colors.primary}>
                      {skill}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText color={colors.textMuted}>No skills have been added yet.</AppText>
            )}
          </AnimatedEntrance>

          <AnimatedEntrance delay={110} style={styles.section}>
            <View>
              <AppText variant="subtitle">Profile status</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Signals shown without claiming that safety is guaranteed
              </AppText>
            </View>
            <View style={styles.signals}>
              <Signal
                icon="shield-checkmark-outline"
                label="Identity"
                value={identityLabels[profile.identityStatus]}
                positive={profile.identityStatus === 'VERIFIED'}
              />
              <Signal
                icon="mail-outline"
                label="Email"
                value={profile.emailVerified ? 'Verified' : 'Verification needed'}
                positive={profile.emailVerified}
              />
              <Signal
                icon="briefcase-outline"
                label="Task record"
                value={
                  profile.completedJobs === 1
                    ? '1 completed task'
                    : `${profile.completedJobs} completed tasks`
                }
                positive={profile.completedJobs > 0}
              />
            </View>
          </AnimatedEntrance>

          <AnimatedEntrance delay={150} style={styles.section}>
            <View>
              <AppText variant="subtitle">Reviews</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Feedback from clients after completed tasks
              </AppText>
            </View>

            {reviews.items.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Ionicons name="sparkles-outline" size={30} color={colors.primary} />
                <AppText variant="bodyMedium">Your first review will appear here</AppText>
                <AppText variant="caption" color={colors.textMuted} style={styles.centerText}>
                  Reviews are optional, so completed work may not always include feedback.
                </AppText>
              </View>
            ) : (
              <View>
                {reviews.items.map((review, index) => (
                  <ReviewItem key={review.id} review={review} bordered={index > 0} />
                ))}
              </View>
            )}

            {reviewError ? (
              <AppText variant="caption" color={colors.danger} style={styles.centerText}>
                {reviewError}
              </AppText>
            ) : null}
            {reviews.hasNext ? (
              <Button
                label="Load more reviews"
                variant="secondary"
                loading={loadingMore}
                onPress={() => void loadMore()}
              />
            ) : null}
          </AnimatedEntrance>
        </>
      )}
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="title" color="#FFFFFF">
        {value}
      </AppText>
      <AppText variant="caption" color="#FFFFFFB8">
        {label}
      </AppText>
    </View>
  );
}

function Signal({
  icon,
  label,
  value,
  positive,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  positive: boolean;
}) {
  const { colors } = useAppTheme();
  const tone = positive ? colors.success : colors.warning;
  return (
    <View style={[styles.signal, { borderBottomColor: colors.divider }]}>
      <Ionicons name={icon} size={21} color={tone} />
      <View style={styles.signalCopy}>
        <AppText variant="caption" color={colors.textMuted}>
          {label}
        </AppText>
        <AppText variant="bodyMedium">{value}</AppText>
      </View>
      <Ionicons name={positive ? 'checkmark-circle' : 'time-outline'} size={18} color={tone} />
    </View>
  );
}

function ReviewItem({ review, bordered }: { review: TaskReview; bordered: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[styles.review, bordered && { borderTopColor: colors.divider, borderTopWidth: 1 }]}
    >
      <Avatar name={review.reviewerFirstName || 'Client'} size={44} />
      <View style={styles.reviewCopy}>
        <View style={styles.reviewTop}>
          <View style={styles.reviewTitle}>
            <AppText variant="bodyMedium">{review.reviewerFirstName || 'Client'}</AppText>
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {review.taskTitle}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            {new Date(review.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </AppText>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= review.rating ? 'star' : 'star-outline'}
              size={15}
              color={colors.warning}
            />
          ))}
        </View>
        <AppText color={review.comment ? colors.textSecondary : colors.textMuted}>
          {review.comment ?? 'No written feedback.'}
        </AppText>
      </View>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeleton}>
      <SkeletonBlock height={270} borderRadius={radius.xl} />
      <SkeletonBlock width={120} height={20} />
      <View style={styles.skills}>
        <SkeletonBlock width={96} height={30} borderRadius={radius.pill} />
        <SkeletonBlock width={116} height={30} borderRadius={radius.pill} />
      </View>
      {[1, 2, 3].map((item) => (
        <SkeletonBlock key={item} height={62} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  hero: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroIdentity: { flex: 1, gap: 3 },
  activeSignal: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86EFAC' },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricDivider: { width: 1, height: 34, backgroundColor: '#FFFFFF38' },
  section: { gap: spacing.lg },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  signals: { gap: 0 },
  signal: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  signalCopy: { flex: 1, gap: 2 },
  review: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  reviewCopy: { flex: 1, gap: spacing.sm },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reviewTitle: { flex: 1, gap: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  emptyReviews: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  stateMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { textAlign: 'center', maxWidth: 330 },
  skeleton: { gap: spacing.lg },
});
