import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { useAuth } from '@/src/features/auth/AuthContext';
import { radius, spacing, useAppTheme } from '@/src/theme';

type TaskTab = 'mine' | 'open';

const myTaskExamples = [
  {
    title: 'Home cleaning',
    location: 'Yaba, Lagos',
    schedule: 'Today, 10:00 AM',
    price: '₦6,000',
    status: 'In progress',
  },
  {
    title: 'Laundry & ironing',
    location: 'Surulere, Lagos',
    schedule: 'Tomorrow, 2:00 PM',
    price: '₦4,000',
    status: 'Accepted',
  },
];

const openTaskExamples = [
  {
    title: 'Kitchen tap repair',
    location: 'Ikeja, Lagos',
    schedule: 'Today, 4:30 PM',
    price: '₦8,500',
    distance: '2.1 km away',
    category: 'Plumbing',
  },
  {
    title: 'Two-bedroom deep clean',
    location: 'Yaba, Lagos',
    schedule: 'Tomorrow, 9:00 AM',
    price: '₦12,000',
    distance: '3.4 km away',
    category: 'Cleaning',
  },
  {
    title: 'Deliver a small package',
    location: 'Maryland, Lagos',
    schedule: 'Friday, 1:00 PM',
    price: '₦4,500',
    distance: '4.8 km away',
    category: 'Delivery',
  },
];

export default function TasksScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<TaskTab>('mine');
  const isWorker = user?.role === 'RUNNER';

  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="title">Tasks</AppText>
          <AppText color={colors.textSecondary}>
            {isWorker
              ? 'Manage your jobs and find your next one.'
              : 'Everything you have posted, in one place.'}
          </AppText>
        </View>
        <Pressable
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </Pressable>
      </AnimatedEntrance>

      <AnimatedEntrance
        delay={70}
        style={StyleSheet.flatten([styles.tabs, { backgroundColor: colors.surfaceSecondary }])}
      >
        <TabButton label="My tasks" active={tab === 'mine'} onPress={() => setTab('mine')} />
        <TabButton
          label={isWorker ? 'Open for you' : 'Open tasks'}
          active={tab === 'open'}
          onPress={() => setTab('open')}
        />
      </AnimatedEntrance>

      {tab === 'mine' ? (
        <AnimatedEntrance key="mine" delay={110} style={styles.list}>
          <View style={styles.listHeading}>
            <AppText variant="subtitle">My tasks</AppText>
            <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
              <AppText variant="caption" color={colors.primary}>
                {myTaskExamples.length}
              </AppText>
            </View>
          </View>
          {myTaskExamples.map((task) => (
            <TaskCard key={task.title} {...task} />
          ))}
          <SurfaceCard style={styles.browseCard}>
            <View style={[styles.browseIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons
                name={isWorker ? 'search-outline' : 'add-outline'}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.browseCopy}>
              <AppText variant="bodyMedium">
                {isWorker ? 'Looking for more work?' : 'Need something else done?'}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {isWorker
                  ? 'Explore available jobs around you.'
                  : 'Create another task whenever you are ready.'}
              </AppText>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
          </SurfaceCard>
        </AnimatedEntrance>
      ) : (
        <AnimatedEntrance key="open" delay={110} style={styles.list}>
          <View style={styles.listHeading}>
            <View>
              <AppText variant="subtitle">
                {isWorker ? 'Recommended nearby' : 'Marketplace activity'}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {isWorker ? 'Matched to your skill and location' : 'Recently posted around you'}
              </AppText>
            </View>
            <View style={[styles.liveBadge, { backgroundColor: colors.successSoft }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <AppText variant="caption" color={colors.success}>
                Live
              </AppText>
            </View>
          </View>
          {openTaskExamples.map((task) => (
            <OpenTaskCard key={task.title} task={task} canApply={isWorker} />
          ))}
        </AnimatedEntrance>
      )}
    </Screen>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress(): void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        { backgroundColor: active ? colors.surface : 'transparent', opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <AppText variant="bodyMedium" color={active ? colors.primary : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

function TaskCard({ title, location, schedule, price, status }: (typeof myTaskExamples)[number]) {
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={styles.taskCard}>
      <View style={styles.taskTop}>
        <AppText variant="subtitle" style={styles.taskTitle}>
          {title}
        </AppText>
        <View style={[styles.statusBadge, { backgroundColor: colors.infoSoft }]}>
          <AppText variant="caption" color={colors.info}>
            {status}
          </AppText>
        </View>
      </View>
      <DetailRow icon="location-outline" text={location} />
      <DetailRow icon="time-outline" text={schedule} />
      <View style={[styles.taskFooter, { borderTopColor: colors.divider }]}>
        <AppText variant="subtitle">{price}</AppText>
        <View style={styles.viewAction}>
          <AppText variant="bodyMedium" color={colors.primary}>
            View details
          </AppText>
          <Ionicons name="chevron-forward" size={17} color={colors.primary} />
        </View>
      </View>
    </SurfaceCard>
  );
}

function OpenTaskCard({
  task,
  canApply,
}: {
  task: (typeof openTaskExamples)[number];
  canApply: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={styles.taskCard}>
      <View style={styles.taskTop}>
        <View style={styles.taskTitle}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primarySoft }]}>
            <AppText variant="caption" color={colors.primary}>
              {task.category}
            </AppText>
          </View>
          <AppText variant="subtitle">{task.title}</AppText>
        </View>
        <AppText variant="subtitle" color={colors.brandDark}>
          {task.price}
        </AppText>
      </View>
      <View style={styles.openDetails}>
        <DetailRow icon="location-outline" text={`${task.location} · ${task.distance}`} />
        <DetailRow icon="calendar-outline" text={task.schedule} />
      </View>
      <Button
        label={canApply ? 'View and apply' : 'View task'}
        icon={canApply ? 'paper-plane-outline' : 'eye-outline'}
        variant="secondary"
        onPress={() => undefined}
      />
    </SurfaceCard>
  );
}

function DetailRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="caption" color={colors.textSecondary}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCopy: { flex: 1, gap: spacing.xs, paddingRight: spacing.lg },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', borderRadius: radius.lg, padding: 4 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  list: { gap: spacing.md },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: radius.pill },
  taskCard: { gap: spacing.sm },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  taskTitle: { flex: 1, gap: spacing.sm },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  openDetails: { gap: spacing.xs, marginBottom: spacing.sm },
  taskFooter: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  browseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderStyle: 'dashed',
  },
  browseIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseCopy: { flex: 1, gap: 2 },
});
