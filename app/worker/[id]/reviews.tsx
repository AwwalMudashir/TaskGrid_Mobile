import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthHeader } from "@/src/components/ui/AuthHeader";
import { AppText } from "@/src/components/ui/AppText";
import { Avatar } from "@/src/components/ui/Avatar";
import { Button } from "@/src/components/ui/Button";
import { Screen } from "@/src/components/ui/Screen";
import { SkeletonBlock } from "@/src/components/ui/SkeletonLoader";
import {
  taskApi,
  type TaskReview,
  type WorkerReviewPage,
} from "@/src/features/tasks/task-api";
import { ApiError } from "@/src/lib/api";
import { radius, spacing, useAppTheme } from "@/src/theme";

const emptyPage: WorkerReviewPage = {
  content: [],
  number: 0,
  last: true,
  totalElements: 0,
};

export default function WorkerReviewsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { colors } = useAppTheme();
  const [result, setResult] = useState<WorkerReviewPage>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (page = 0, forceRefresh = false) => {
      if (!id) return;
      page === 0 ? setLoading(true) : setLoadingMore(true);
      setError("");
      try {
        const next = await taskApi.workerReviews(id, page, forceRefresh);
        setResult((current) => ({
          ...next,
          content:
            page === 0
              ? next.content
              : [
                  ...current.content,
                  ...next.content.filter(
                    (review) =>
                      !current.content.some(
                        (existing) => existing.id === review.id,
                      ),
                  ),
                ],
        }));
      } catch (cause) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : "We couldn't load these reviews.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const firstName = name?.trim().split(/\s+/, 1)[0] || "Worker";

  return (
    <Screen contentStyle={styles.screen}>
      <AuthHeader
        title={`${firstName}'s reviews`}
        subtitle={
          result.totalElements > 0
            ? `${result.totalElements} ${result.totalElements === 1 ? "review" : "reviews"} from completed tasks`
            : "Feedback from completed tasks"
        }
      />

      {loading ? (
        <ReviewsSkeleton />
      ) : error ? (
        <View style={styles.state}>
          <Ionicons
            name="cloud-offline-outline"
            size={34}
            color={colors.danger}
          />
          <AppText variant="subtitle">Reviews unavailable</AppText>
          <AppText color={colors.textMuted} style={styles.centerText}>
            {error}
          </AppText>
          <Button
            label="Try again"
            variant="secondary"
            onPress={() => void load(0, true)}
          />
        </View>
      ) : result.content.length === 0 ? (
        <View style={styles.state}>
          <View
            style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={28}
              color={colors.primary}
            />
          </View>
          <AppText variant="subtitle">No reviews yet</AppText>
          <AppText color={colors.textMuted} style={styles.centerText}>
            This worker has not received feedback from completed tasks yet.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          <View>
            <AppText variant="subtitle">All feedback</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Most recent first
            </AppText>
          </View>
          {result.content.map((review, index) => (
            <ReviewRow key={review.id} review={review} bordered={index > 0} />
          ))}
          {!result.last ? (
            <Button
              label="Load more reviews"
              variant="secondary"
              loading={loadingMore}
              onPress={() => void load(result.number + 1)}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function ReviewRow({
  review,
  bordered,
}: {
  review: TaskReview;
  bordered: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.review,
        bordered && { borderTopColor: colors.divider, borderTopWidth: 1 },
      ]}
    >
      <Avatar name={review.reviewerFirstName || "Client"} size={44} />
      <View style={styles.reviewCopy}>
        <View style={styles.reviewHeading}>
          <View style={styles.reviewTitle}>
            <AppText variant="bodyMedium">
              {review.reviewerFirstName || "Client"}
            </AppText>
            <AppText
              variant="caption"
              color={colors.textMuted}
              numberOfLines={1}
            >
              {review.taskTitle}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            {new Date(review.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </AppText>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= review.rating ? "star" : "star-outline"}
              size={15}
              color={colors.warning}
            />
          ))}
        </View>
        <AppText
          color={review.comment ? colors.textSecondary : colors.textMuted}
        >
          {review.comment ?? "No written feedback."}
        </AppText>
      </View>
    </View>
  );
}

function ReviewsSkeleton() {
  return (
    <View style={styles.list}>
      <SkeletonBlock width={140} height={20} />
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <SkeletonBlock width={44} height={44} borderRadius={22} />
          <View style={styles.reviewCopy}>
            <SkeletonBlock width="48%" height={15} />
            <SkeletonBlock width="76%" height={12} />
            <SkeletonBlock width="92%" height={36} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  list: { gap: spacing.lg },
  review: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  reviewCopy: { flex: 1, gap: spacing.sm },
  reviewHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reviewTitle: { flex: 1, gap: 2 },
  stars: { flexDirection: "row", gap: 2 },
  state: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: { maxWidth: 330, textAlign: "center", lineHeight: 21 },
  skeletonRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
