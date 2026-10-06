import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { radius, spacing, useAppTheme } from "@/src/theme";

type BlockProps = {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({
  width = "100%",
  height,
  borderRadius = radius.sm,
  style,
}: BlockProps) {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  const { colors } = useAppTheme();
  return (
    <View accessibilityLabel="Loading tasks" style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.taskCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.taskTop}>
            <SkeletonBlock width={92} height={11} borderRadius={radius.pill} />
            <SkeletonBlock width={58} height={20} borderRadius={radius.pill} />
          </View>
          <SkeletonBlock width="72%" height={18} />
          <SkeletonBlock width="92%" height={13} />
          <View style={styles.taskBottom}>
            <SkeletonBlock width={112} height={13} />
            <SkeletonBlock width={76} height={16} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function RecommendedTaskSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View accessibilityLabel="Loading recommended tasks" style={styles.list}>
      {Array.from({ length: 3 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.recommendedTask,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <SkeletonBlock width={42} height={42} borderRadius={radius.md} />
          <View style={styles.grow}>
            <SkeletonBlock width="74%" height={15} />
            <SkeletonBlock width="92%" height={11} />
          </View>
          <SkeletonBlock width={66} height={15} />
        </View>
      ))}
    </View>
  );
}

export function RecommendedWorkerSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityLabel="Loading recommended workers"
      style={styles.workerRow}
    >
      {Array.from({ length: 2 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.workerCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <SkeletonBlock width={54} height={54} borderRadius={27} />
          <SkeletonBlock width="84%" height={16} />
          <SkeletonBlock width="66%" height={12} />
          <SkeletonBlock width={52} height={13} />
        </View>
      ))}
    </View>
  );
}

export function TransactionListSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityLabel="Loading transactions"
      style={[
        styles.transactionList,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.transactionRow,
            index > 0 && { borderTopColor: colors.divider, borderTopWidth: 1 },
          ]}
        >
          <SkeletonBlock width={40} height={40} borderRadius={radius.md} />
          <View style={styles.grow}>
            <SkeletonBlock width="58%" height={14} />
            <SkeletonBlock width="42%" height={11} />
          </View>
          <SkeletonBlock width={72} height={15} />
        </View>
      ))}
    </View>
  );
}

export function TaskDetailSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View accessibilityLabel="Loading task details" style={styles.detailPage}>
      <View
        style={[
          styles.detailHero,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.taskTop}>
          <SkeletonBlock width={104} height={12} borderRadius={radius.pill} />
          <SkeletonBlock width={68} height={24} borderRadius={radius.pill} />
        </View>
        <SkeletonBlock width="78%" height={25} />
        <SkeletonBlock width="96%" height={13} />
        <SkeletonBlock width="72%" height={13} />
        <View style={styles.detailMetaRow}>
          <SkeletonBlock width={112} height={16} />
          <SkeletonBlock width={86} height={16} />
        </View>
      </View>

      <View style={styles.detailSection}>
        <SkeletonBlock width={128} height={18} />
        <View style={styles.mediaRow}>
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock
              key={index}
              width={92}
              height={92}
              borderRadius={radius.md}
            />
          ))}
        </View>
      </View>

      <View style={styles.detailSection}>
        <SkeletonBlock width={148} height={18} />
        <SkeletonBlock width="100%" height={62} borderRadius={radius.md} />
        <SkeletonBlock width="100%" height={62} borderRadius={radius.md} />
      </View>
    </View>
  );
}

export function DisputeDetailSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityLabel="Loading dispute details"
      style={styles.detailPage}
    >
      <View
        style={[
          styles.caseHero,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <SkeletonBlock width={54} height={54} borderRadius={27} />
        <SkeletonBlock width={112} height={12} borderRadius={radius.pill} />
        <SkeletonBlock width="76%" height={24} />
        <SkeletonBlock width="94%" height={13} />
        <SkeletonBlock width="64%" height={13} />
      </View>
      <View style={styles.detailSection}>
        <SkeletonBlock width={116} height={18} />
        <SkeletonBlock width="88%" height={16} />
        <SkeletonBlock width="62%" height={12} />
      </View>
      <View style={styles.detailSection}>
        <SkeletonBlock width={152} height={18} />
        <SkeletonBlock width="100%" height={88} borderRadius={radius.md} />
      </View>
    </View>
  );
}

export function FormFieldsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <View accessibilityLabel="Loading form details" style={styles.formFields}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.formField}>
          <SkeletonBlock width={index % 2 === 0 ? 112 : 86} height={11} />
          <SkeletonBlock height={56} borderRadius={radius.md} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  taskCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  taskTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recommendedTask: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  grow: { flex: 1, gap: spacing.sm },
  workerRow: { flexDirection: "row", gap: spacing.md, overflow: "hidden" },
  workerCard: {
    width: 184,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  transactionList: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  transactionRow: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  detailPage: { gap: spacing.xl },
  detailHero: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  detailMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  detailSection: { gap: spacing.md },
  mediaRow: { flexDirection: "row", gap: spacing.sm, overflow: "hidden" },
  caseHero: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  formFields: { gap: spacing.lg },
  formField: { gap: 6 },
});
