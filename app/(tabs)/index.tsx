import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Avatar } from '@/src/components/ui/Avatar';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { useAuth } from '@/src/features/auth/AuthContext';
import { RecommendedWorkers } from '@/src/components/home/RecommendedWorkers';
import { RecommendedTasks } from '@/src/components/home/RecommendedTasks';
import { WorkerLocationMap } from '@/src/components/home/WorkerLocationMap';
import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const firstName = user?.fullName.split(' ')[0] || 'there';
  const isWorker = user?.role === 'RUNNER';
  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.header}>
        <View style={styles.greeting}>
          <AppText variant="eyebrow" color={colors.primary}>
            {greeting()}
          </AppText>
          <AppText variant="title">Hello, {firstName}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Avatar name={firstName} uri={user?.profilePictureUrl} size={50} />
        </Pressable>
      </AnimatedEntrance>
      <AnimatedEntrance delay={70}>
        <LinearGradient
          colors={isDark ? ['#20245B', '#34379A', '#5557E8'] : ['#3436A7', '#5557E8', '#7375F2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadows.card]}
        >
          <View style={styles.orbOne} />
          <View style={styles.orbTwo} />
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons
                name={isWorker ? 'compass-outline' : 'sparkles-outline'}
                size={22}
                color="#FFFFFF"
              />
            </View>
            <AppText variant="eyebrow" color="rgba(255,255,255,0.76)">
              {isWorker ? 'WORK NEARBY' : 'QUICK START'}
            </AppText>
          </View>
          <View style={styles.heroCopy}>
            <AppText variant="title" color="#FFFFFF">
              {isWorker ? 'Find your next task' : 'What can we help with?'}
            </AppText>
            <AppText color="rgba(255,255,255,0.78)">
              {isWorker
                ? 'Explore open work that matches your primary skill.'
                : 'Create a clear task and connect with a trusted local worker.'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/tasks')}
            style={({ pressed }) => [styles.heroButton, { opacity: pressed ? 0.86 : 1 }]}
          >
            <AppText variant="button" color="#24266C">
              {isWorker ? 'Browse open tasks' : 'Create a task'}
            </AppText>
            <Ionicons name="arrow-forward" size={18} color="#24266C" />
          </Pressable>
        </LinearGradient>
      </AnimatedEntrance>
      <AnimatedEntrance delay={130} style={styles.section}>
        <View>
          <AppText variant="subtitle">Your workspace</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            The essentials, kept close
          </AppText>
        </View>
        <SurfaceCard style={styles.actionsCard}>
          <Action
            icon="clipboard-outline"
            label="Tasks"
            detail={isWorker ? 'Manage and find work' : 'Post and manage requests'}
            color={colors.primary}
            background={colors.primarySoft}
            onPress={() => router.push('/(tabs)/tasks')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <Action
            icon="chatbubble-ellipses-outline"
            label="Messages"
            detail="Task conversations"
            color={colors.accent}
            background={colors.successSoft}
            onPress={() => router.push('/(tabs)/messages')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <Action
            icon="wallet-outline"
            label="Wallet"
            detail="Payments and escrow"
            color={colors.warning}
            background={colors.warningSoft}
            onPress={() => router.push('/(tabs)/wallet')}
          />
        </SurfaceCard>
      </AnimatedEntrance>
      <AnimatedEntrance delay={165}>
        {isWorker ? <RecommendedTasks /> : <RecommendedWorkers />}
      </AnimatedEntrance>
      {isWorker ? (
        <AnimatedEntrance delay={195}>
          <WorkerLocationMap />
        </AnimatedEntrance>
      ) : null}
      <AnimatedEntrance delay={190} style={styles.section}>
        <AppText variant="subtitle">Account readiness</AppText>
        {!user?.emailVerified ? (
          <NoticeCard tone="warning" icon="mail-unread-outline" title="Verify your email">
            Complete email verification before using protected TaskGrid features.
          </NoticeCard>
        ) : (
          <NoticeCard tone="success" title="Email verified">
            Your sign-in email has been confirmed.
          </NoticeCard>
        )}
        <NoticeCard icon="shield-checkmark-outline" title="Safety before work">
          Add an emergency contact from Profile before posting or accepting a task.
        </NoticeCard>
      </AnimatedEntrance>
    </Screen>
  );
}

function Action({
  icon,
  label,
  detail,
  color,
  background,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  color: string;
  background: string;
  onPress(): void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.68 : 1 }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <View style={styles.actionCopy}>
        <AppText variant="bodyMedium">{label}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {detail}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { gap: 1 },
  hero: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg, overflow: 'hidden' },
  orbOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.09)',
    right: -50,
    top: -80,
  },
  orbTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
    left: -35,
    bottom: -40,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { gap: spacing.sm, maxWidth: 310 },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  section: { gap: spacing.md },
  actionsCard: { paddingVertical: spacing.xs },
  action: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, gap: 1 },
  divider: { height: 1, marginLeft: 54 },
});
