import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/src/components/ui/AppText";
import { useAuth } from "@/src/features/auth/AuthContext";
import { consumePendingFeatureTour } from "@/src/features/onboarding/feature-tour-storage";
import { useTourTargets } from "@/src/features/onboarding/TourTargetRegistry";
import { radius, shadows, spacing, useAppTheme } from "@/src/theme";

type Spotlight = { x: number; y: number; width: number; height: number };
type TourStep = {
  eyebrow: string;
  title: string;
  description: string;
  target: "hero" | "tasks" | "messages" | "wallet" | "profile";
};

const workerSteps: TourStep[] = [
  {
    eyebrow: "FIND THE RIGHT WORK",
    title: "Start with nearby tasks",
    description:
      "Browse work that fits your skills and location. You choose what to apply for and always see the task details first.",
    target: "hero",
  },
  {
    eyebrow: "FOLLOW EVERY STAGE",
    title: "Your tasks stay organised",
    description:
      "Applications, accepted work, active jobs and completed tasks are kept together so you always know what happens next.",
    target: "tasks",
  },
  {
    eyebrow: "PAYMENT PROTECTION",
    title: "Know where your money is",
    description:
      "Clients pay before work begins. Earnings move from protected payment to your wallet after completion is confirmed.",
    target: "wallet",
  },
  {
    eyebrow: "BUILD TRUST SAFELY",
    title: "Finish your trusted profile",
    description:
      "Manage identity checks, skills, your payout bank and emergency contact here. Location sharing is always consent-based.",
    target: "profile",
  },
];

const clientSteps: TourStep[] = [
  {
    eyebrow: "POST WITH CLARITY",
    title: "Describe what you need",
    description:
      "Add the job, budget, time, location and helpful photos. Clear information helps workers send useful bids.",
    target: "hero",
  },
  {
    eyebrow: "YOU STAY IN CONTROL",
    title: "Compare before choosing",
    description:
      "Review bids, worker profiles, skills and ratings. TaskGrid can recommend options, but the final choice is yours.",
    target: "tasks",
  },
  {
    eyebrow: "KEEP THE CONVERSATION",
    title: "Use task messages",
    description:
      "Keep important job details connected to the task instead of losing them across calls and separate chats.",
    target: "messages",
  },
  {
    eyebrow: "TRUST AND PROTECTION",
    title: "Safety settings live here",
    description:
      "Complete verification and add an emergency contact before work. Protected payment and disputes help both sides stay covered.",
    target: "profile",
  },
];

export function FirstRunFeatureTour() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const { targets } = useTourTargets();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const arrowMotion = useRef(new Animated.Value(0)).current;
  const steps = user?.role === "RUNNER" ? workerSteps : clientSteps;
  const step = steps[stepIndex];

  useEffect(() => {
    let active = true;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    setVisible(false);
    setStepIndex(0);
    if (!user || user.role === "ADMIN") return () => undefined;

    const currentUser = user;
    void consumePendingFeatureTour(currentUser)
      .then((shouldShow) => {
        if (!active || !shouldShow) return;
        router.replace("/(tabs)");
        revealTimer = setTimeout(() => {
          if (active) setVisible(true);
        }, 450);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [router, user?.email, user?.id, user?.role]);

  useEffect(() => {
    if (!visible) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowMotion, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(arrowMotion, {
          toValue: 0,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [arrowMotion, visible]);

  const target = useMemo<Spotlight>(() => {
    const horizontalMargin = spacing.md;
    if (step.target === "hero") {
      return {
        x: horizontalMargin,
        y: insets.top + 84,
        width: width - horizontalMargin * 2,
        height: Math.min(300, height * 0.38),
      };
    }

    const spotlightSize =
      step.target === "messages" ? 78 : step.target === "profile" ? 74 : 70;
    const measured = targets[step.target];
    if (measured) {
      const verticalNudge = step.target === "messages" ? 3 : 0;
      return {
        x: Math.max(
          4,
          Math.min(
            width - spotlightSize - 4,
            measured.x + measured.width / 2 - spotlightSize / 2,
          ),
        ),
        y: Math.max(
          4,
          Math.min(
            height - spotlightSize - 4,
            measured.y +
              measured.height / 2 -
              spotlightSize / 2 +
              verticalNudge,
          ),
        ),
        width: spotlightSize,
        height: spotlightSize,
      };
    }

    const tabCount = user?.role === "RUNNER" ? 5 : 4;
    const tabIndex =
      step.target === "tasks"
        ? 1
        : step.target === "profile"
          ? tabCount - 1
          : step.target === "wallet"
            ? 3
            : 2;
    const tabWidth = width / tabCount;
    return {
      x: tabIndex * tabWidth + (tabWidth - spotlightSize) / 2,
      y: height - spotlightSize - 4,
      width: spotlightSize,
      height: spotlightSize,
    };
  }, [height, insets.top, step.target, targets, user?.role, width]);

  if (!user || user.role === "ADMIN" || !step) return null;

  function finish() {
    setVisible(false);
  }

  function next() {
    if (stepIndex === steps.length - 1) {
      finish();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  const targetIsLow = target.y > height / 2;
  const navTarget = step.target !== "hero";
  const cardPosition = targetIsLow
    ? { bottom: height - target.y + 72 }
    : { top: Math.min(target.y + target.height + 72, height - 300) };
  const arrowLeft = Math.max(
    12,
    Math.min(width - 56, target.x + target.width / 2 - 22),
  );
  const arrowTranslate = arrowMotion.interpolate({
    inputRange: [0, 1],
    outputRange: targetIsLow ? [-2, 7] : [2, -7],
  });
  const navPresentation =
    step.target === "tasks"
      ? { icon: "clipboard" as const, label: "Tasks" }
      : step.target === "profile"
        ? { icon: "person" as const, label: "Profile" }
        : step.target === "wallet"
          ? { icon: "wallet" as const, label: "Wallet" }
          : { icon: "chatbubble" as const, label: "Messages" };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={finish}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Continue feature tour"
          onPress={next}
          style={StyleSheet.absoluteFill}
        />

        {navTarget ? (
          <>
            <BlurPanel style={styles.fullBlur} dark={isDark} />
            <View
              pointerEvents="none"
              style={[
                styles.navSpotlight,
                {
                  left: target.x,
                  top: target.y,
                  width: target.width,
                  height: target.height,
                  borderRadius: target.width / 2,
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name={navPresentation.icon}
                size={25}
                color={colors.primary}
              />
              <AppText
                variant="caption"
                color={colors.primary}
                style={styles.navLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {navPresentation.label}
              </AppText>
            </View>
          </>
        ) : (
          <HeroSpotlight
            target={target}
            width={width}
            height={height}
            dark={isDark}
          />
        )}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.arrow,
            targetIsLow
              ? { top: target.y - 54 }
              : { top: target.y + target.height + 8 },
            {
              left: arrowLeft,
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              transform: [{ translateY: arrowTranslate }],
            },
          ]}
        >
          <Ionicons
            name={targetIsLow ? "arrow-down" : "arrow-up"}
            size={27}
            color={colors.textOnPrimary}
          />
        </Animated.View>

        <View
          style={[
            styles.card,
            shadows.card,
            cardPosition,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardTop}>
            <AppText variant="eyebrow" color={colors.primary}>
              {step.eyebrow}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {stepIndex + 1} / {steps.length}
            </AppText>
          </View>
          <AppText variant="title">{step.title}</AppText>
          <AppText color={colors.textSecondary}>{step.description}</AppText>
          <View style={styles.progress}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      index === stepIndex ? colors.primary : colors.border,
                    borderColor:
                      index === stepIndex ? colors.primary : colors.textMuted,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={finish}>
              <AppText variant="bodyMedium" color={colors.textMuted}>
                Skip tour
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={next}
              style={({ pressed }) => [
                styles.nextButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <AppText variant="button" color={colors.textOnPrimary}>
                {stepIndex === steps.length - 1
                  ? "Start using TaskGrid"
                  : "Next"}
              </AppText>
              <Ionicons
                name={
                  stepIndex === steps.length - 1 ? "checkmark" : "arrow-forward"
                }
                size={18}
                color={colors.textOnPrimary}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function HeroSpotlight({
  target,
  width,
  height,
  dark,
}: {
  target: Spotlight;
  width: number;
  height: number;
  dark: boolean;
}) {
  return (
    <>
      <BlurPanel
        style={{ left: 0, top: 0, width, height: target.y }}
        dark={dark}
      />
      <BlurPanel
        style={{
          left: 0,
          top: target.y,
          width: target.x,
          height: target.height,
        }}
        dark={dark}
      />
      <BlurPanel
        style={{
          left: target.x + target.width,
          top: target.y,
          width: Math.max(0, width - target.x - target.width),
          height: target.height,
        }}
        dark={dark}
      />
      <BlurPanel
        style={{
          left: 0,
          top: target.y + target.height,
          width,
          height: Math.max(0, height - target.y - target.height),
        }}
        dark={dark}
      />
    </>
  );
}

function BlurPanel({ style, dark }: { style: ViewStyle; dark: boolean }) {
  return (
    <BlurView
      pointerEvents="none"
      intensity={48}
      tint={dark ? "dark" : "regular"}
      blurMethod="dimezisBlurViewSdk31Plus"
      style={[styles.blurPanel, style]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  blurPanel: {
    position: "absolute",
    backgroundColor: "rgba(5, 12, 28, 0.38)",
  },
  fullBlur: { left: 0, top: 0, right: 0, bottom: 0 },
  navSpotlight: {
    position: "absolute",
    zIndex: 4,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
  },
  navLabel: { width: "88%", fontSize: 10, textAlign: "center" },
  arrow: {
    position: "absolute",
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.58,
    shadowRadius: 12,
    elevation: 18,
  },
  card: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progress: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
  progressDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  nextButton: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
