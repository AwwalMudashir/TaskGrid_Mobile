import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { SkeletonBlock } from '@/src/components/ui/SkeletonLoader';
import { taskApi, type ReceivedReviewPage, type TaskReview } from '@/src/features/tasks/task-api';
import { ApiError } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const emptyResult: ReceivedReviewPage = {
  averageRating: 0,
  reviewCount: 0,
  items: [],
  page: 0,
  hasNext: false,
};

export default function ClientReviewsScreen() {
  const { colors } = useAppTheme();
  const [result, setResult] = useState<ReceivedReviewPage>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 0) => {
    page === 0 ? setLoading(true) : setLoadingMore(true);
    setError('');
    try {
      const next = await taskApi.receivedReviews(page);
      setResult((current) => ({
        ...next,
        items:
          page === 0
            ? next.items
            : [
                ...current.items,
                ...next.items.filter(
                  (item) => !current.items.some((existing) => existing.id === item.id),
                ),
              ],
      }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't load your reviews.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen contentStyle={styles.screen}>
      <AuthHeader
        title="My reviews"
        subtitle="Feedback workers have shared after completed tasks"
      />

      {loading ? (
        <ReviewsSkeleton />
      ) : error ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
          <AppText variant="subtitle">Reviews unavailable</AppText>
          <AppText color={colors.textMuted} style={styles.centerText}>
            {error}
          </AppText>
          <Button label="Try again" variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ratingHero}
          >
            <View style={styles.ratingTop}>
              <View>
                <AppText variant="eyebrow" color="#FFFFFFC7">
                  CLIENT REPUTATION
                </AppText>
                <AppText variant="display" color="#FFFFFF" style={styles.ratingNumber}>
                  {result.reviewCount > 0 ? Number(result.averageRating).toFixed(1) : '—'}
                </AppText>
              </View>
              <View style={styles.starSeal}>
                <Ionicons name="star" size={28} color="#FBBF24" />
              </View>
            </View>
            <View style={styles.heroStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(result.averageRating) ? 'star' : 'star-outline'}
                  size={20}
                  color="#FFFFFF"
                />
              ))}
            </View>
            <AppText color="#FFFFFFD8">
              {result.reviewCount === 0
                ? 'Complete tasks to begin building trust with workers.'
                : `Based on ${result.reviewCount} ${result.reviewCount === 1 ? 'review' : 'reviews'} from workers.`}
            </AppText>
          </LinearGradient>

          {result.items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.primary} />
              </View>
              <AppText variant="subtitle">No reviews yet</AppText>
              <AppText color={colors.textMuted} style={styles.centerText}>
                After a completed task, the worker may leave optional feedback about communication,
                clarity and the overall experience.
              </AppText>
            </View>
          ) : (
            <View style={styles.reviewSection}>
              <View>
                <AppText variant="subtitle">Feedback received</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Most recent first
                </AppText>
              </View>
              {result.items.map((review, index) => (
                <ReviewRow key={review.id} review={review} bordered={index > 0} />
              ))}
              {result.hasNext ? (
                <Button
                  label="Load more reviews"
                  variant="secondary"
                  loading={loadingMore}
                  onPress={() => void load(result.page + 1)}
                />
              ) : null}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function ReviewRow({ review, bordered }: { review: TaskReview; bordered: boolean }) {
  const { colors } = useAppTheme();
  const initial = review.reviewerFirstName?.charAt(0).toUpperCase() || 'W';
  return (
    <View
      style={[styles.reviewRow, bordered && { borderTopColor: colors.divider, borderTopWidth: 1 }]}
    >
      <View style={[styles.reviewerAvatar, { backgroundColor: colors.primarySoft }]}>
        <AppText variant="bodyMedium" color={colors.primary}>
          {initial}
        </AppText>
      </View>
      <View style={styles.reviewCopy}>
        <View style={styles.reviewHeading}>
          <View style={styles.reviewName}>
            <AppText variant="bodyMedium">{review.reviewerFirstName || 'Worker'}</AppText>
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
        <View style={styles.rowStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= review.rating ? 'star' : 'star-outline'}
              size={15}
              color={colors.warning}
            />
          ))}
        </View>
        {review.comment ? (
          <AppText color={colors.textSecondary} style={styles.comment}>
            “{review.comment}”
          </AppText>
        ) : (
          <AppText variant="caption" color={colors.textMuted}>
            No written feedback.
          </AppText>
        )}
      </View>
    </View>
  );
}

function ReviewsSkeleton() {
  return (
    <View style={styles.skeleton}>
      <SkeletonBlock height={210} borderRadius={radius.xl} />
      <SkeletonBlock width={150} height={20} />
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <SkeletonBlock width={46} height={46} borderRadius={23} />
          <View style={styles.reviewCopy}>
            <SkeletonBlock width="46%" height={15} />
            <SkeletonBlock width="72%" height={12} />
            <SkeletonBlock width="92%" height={34} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  ratingHero: {
    minHeight: 210,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  ratingTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  ratingNumber: { fontSize: 58, lineHeight: 66, marginTop: spacing.xs },
  starSeal: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF24',
  },
  heroStars: { flexDirection: 'row', gap: 4 },
  reviewSection: { gap: spacing.lg },
  reviewRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  reviewerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCopy: { flex: 1, gap: spacing.sm },
  reviewHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reviewName: { flex: 1, gap: 2 },
  rowStars: { flexDirection: 'row', gap: 2 },
  comment: { lineHeight: 22 },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  centerText: { textAlign: 'center', maxWidth: 330, lineHeight: 21 },
  skeleton: { gap: spacing.lg },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
