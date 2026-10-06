import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { TaskListSkeleton } from '@/src/components/ui/SkeletonLoader';
import { useAuth } from '@/src/features/auth/AuthContext';
import { OpenTasksMap } from '@/src/features/tasks/OpenTasksMap';
import {
  taskApi,
  type Coordinates,
  type TaskCard as TaskCardData,
} from '@/src/features/tasks/task-api';
import { ApiError } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

type TaskTab = 'mine' | 'open';
type OpenView = 'list' | 'map';
type MineView = 'current' | 'previous';

function money(amount: number | null) {
  return amount == null
    ? 'Price to agree'
    : `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type StageTone = 'primary' | 'info' | 'warning' | 'success' | 'muted';
type TaskStage = {
  eyebrow: string;
  title: string;
  detail: string;
  step: number;
  tone: StageTone;
};

function taskStage(task: TaskCardData, isWorker: boolean, board: TaskTab): TaskStage {
  const client = task.clientFirstName || 'The client';
  const worker = task.assignedRunnerFirstName || 'Your worker';

  if (task.status === 'CANCELLED' || task.paymentStatus === 'CANCELLED')
    return {
      eyebrow: 'TASK CLOSED',
      title: 'This task was cancelled',
      detail: 'Open the task to review its final status.',
      step: 1,
      tone: 'muted',
    };
  if (task.status === 'DISPUTED' || task.paymentStatus === 'DISPUTED')
    return {
      eyebrow: 'SUPPORT REVIEW',
      title: isWorker ? 'Your earnings are frozen' : 'Your payment is frozen',
      detail: isWorker
        ? 'The disputed amount cannot enter your wallet until TaskGrid resolves the case.'
        : 'The amount cannot be released to the worker while TaskGrid reviews the case.',
      step: 4,
      tone: 'warning',
    };
  if (task.paymentStatus === 'REFUNDED')
    return {
      eyebrow: 'PAYMENT RETURNED',
      title: isWorker ? 'The client was refunded' : 'Your payment was refunded',
      detail: isWorker
        ? 'The case was resolved with the payment returned to the client.'
        : 'The resolved amount was returned to your original payment method.',
      step: 4,
      tone: 'info',
    };
  if (task.status === 'PAID' || task.paymentStatus === 'RELEASED')
    return {
      eyebrow: 'TASK COMPLETE',
      title: isWorker ? `${client} approved your work` : `You approved ${worker}’s work`,
      detail: isWorker
        ? 'Your earnings are now available in your wallet.'
        : 'Payment has been released to the worker.',
      step: 4,
      tone: 'success',
    };
  if (task.status === 'COMPLETED' || task.paymentStatus === 'COMPLETED')
    return {
      eyebrow: 'COMPLETION REVIEW',
      title: isWorker ? `Waiting for ${client} to confirm` : `${worker} marked this task complete`,
      detail: isWorker
        ? 'Your evidence is under review. Earnings release after the deadline if no dispute is opened.'
        : 'Review the evidence before the deadline. Approve the work or open a dispute.',
      step: 4,
      tone: 'warning',
    };
  if (task.paymentStatus === 'FAILED')
    return {
      eyebrow: 'PAYMENT ATTENTION',
      title: isWorker ? `Waiting for ${client} to retry payment` : 'Payment needs your attention',
      detail: isWorker
        ? 'Do not begin until the payment is confirmed.'
        : 'Open the task to restart secure checkout.',
      step: 2,
      tone: 'warning',
    };
  if (task.status === 'ARRIVED')
    return {
      eyebrow: 'WORKER ARRIVED',
      title: isWorker ? 'You checked in at the task' : `${worker} has arrived`,
      detail: isWorker
        ? 'Complete the work, then upload clear completion evidence.'
        : 'Your worker checked in inside the task arrival area.',
      step: 3,
      tone: 'success',
    };
  if (task.status === 'EN_ROUTE')
    return {
      eyebrow: 'ON THE WAY',
      title: isWorker ? `You are travelling to ${client}` : `${worker} is on the way`,
      detail: isWorker
        ? 'Keep TaskGrid open while you choose to share your foreground location.'
        : 'Open the task to see the latest shared location.',
      step: 3,
      tone: 'info',
    };
  if (task.paymentStatus === 'HELD' || task.paymentStatus === 'IN_PROGRESS')
    return {
      eyebrow: 'WORK IN PROGRESS',
      title: isWorker ? 'Complete the task and submit proof' : `${worker} is working on your task`,
      detail: isWorker
        ? `Your earnings are secured. ${client} will review your completion photos.`
        : 'Your payment is protected and has not been paid to the worker yet.',
      step: 3,
      tone: 'primary',
    };
  if (task.paymentStatus === 'INITIALIZED' || task.paymentStatus === 'PROCESSING')
    return {
      eyebrow: 'PAYMENT CONFIRMATION',
      title: isWorker ? `Waiting for ${client}’s payment` : 'Finish payment to start the task',
      detail: isWorker
        ? 'Begin only after TaskGrid confirms the payment is secured.'
        : `${worker} can begin once secure checkout is confirmed.`,
      step: 2,
      tone: 'info',
    };
  if (task.status === 'ACCEPTED') {
    if (isWorker && !task.assignedToViewer)
      return {
        eyebrow: 'APPLICATION CLOSED',
        title: 'Another worker was selected',
        detail: 'Keep exploring—new opportunities are added regularly.',
        step: 2,
        tone: 'muted',
      };
    return {
      eyebrow: 'PAYMENT NEXT',
      title: isWorker ? `Waiting for ${client} to pay` : `${worker} is ready to begin`,
      detail: isWorker
        ? 'Do not begin until TaskGrid confirms the payment.'
        : 'Complete secure checkout so the worker can start.',
      step: 2,
      tone: 'info',
    };
  }
  if (task.status === 'BID_RECEIVED')
    return {
      eyebrow: 'APPLICATIONS',
      title: isWorker
        ? board === 'mine'
          ? `${client} is reviewing applications`
          : 'Applications are open'
        : 'Review your worker applications',
      detail: isWorker
        ? board === 'mine'
          ? 'You will see an update here when the client decides.'
          : 'You can still apply while the task remains open.'
        : 'Compare prices, arrival times and worker profiles.',
      step: 1,
      tone: 'primary',
    };
  return {
    eyebrow: 'FINDING A MATCH',
    title: isWorker ? 'Open for applications' : 'Waiting for workers to apply',
    detail: isWorker
      ? `${client} is accepting applications for this task.`
      : 'We will show applications here as workers respond.',
    step: 1,
    tone: 'primary',
  };
}

export default function TasksScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<TaskTab>('mine');
  const [mineView, setMineView] = useState<MineView>('current');
  const [openView, setOpenView] = useState<OpenView>('list');
  const [items, setItems] = useState<TaskCardData[]>([]);
  const [workerLocation, setWorkerLocation] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [zoneOnly, setZoneOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const workerLocationRef = useRef<Coordinates | null>(null);
  const isWorker = user?.role === 'RUNNER';
  const requestedTab: TaskTab | null = section === 'open' || section === 'mine' ? section : null;
  const activeTab: TaskTab = isWorker ? (requestedTab ?? tab) : 'mine';

  const selectTab = useCallback(
    (nextTab: TaskTab) => {
      setTab(nextTab);
      router.setParams({ section: nextTab });
    },
    [router],
  );

  const load = useCallback(
    async (nextPage = 0) => {
      const version = ++requestVersion.current;
      nextPage === 0 ? setLoading(true) : setLoadingMore(true);
      setError('');
      try {
        let coordinates = workerLocationRef.current;
        if (activeTab === 'open' && nextPage === 0) {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.granted) {
            const current = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            coordinates = {
              latitude: current.coords.latitude,
              longitude: current.coords.longitude,
            };
            workerLocationRef.current = coordinates;
            setWorkerLocation(coordinates);
            await taskApi.updateDiscoveryLocation(coordinates);
          }
        }
        const result = await (activeTab === 'mine'
          ? taskApi.mine(nextPage, mineView === 'current' ? 'CURRENT' : 'PREVIOUS')
          : taskApi.open(nextPage, coordinates ?? undefined, radiusKm, zoneOnly));
        if (version !== requestVersion.current) return;
        setItems((previous) =>
          nextPage === 0
            ? result.items
            : [
                ...previous,
                ...result.items.filter(
                  (item) => !previous.some((existing) => existing.id === item.id),
                ),
              ],
        );
        setPage(result.page);
        setHasNext(result.hasNext);
      } catch (cause) {
        if (version === requestVersion.current) {
          setError(
            cause instanceof ApiError ? cause.message : "We couldn't load tasks. Try again.",
          );
        }
      } finally {
        if (version === requestVersion.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [activeTab, mineView, radiusKm, zoneOnly],
  );

  useFocusEffect(
    useCallback(() => {
      setItems([]);
      void load();
      return () => {
        requestVersion.current++;
      };
    }, [load]),
  );

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
          accessibilityRole="button"
          accessibilityLabel="Refresh tasks"
          onPress={() => load(0)}
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </Pressable>
      </AnimatedEntrance>

      {!isWorker ? (
        <AnimatedEntrance delay={45}>
          <Button label="Post a task" icon="add-outline" onPress={() => router.push('/task/new')} />
        </AnimatedEntrance>
      ) : null}

      {isWorker ? (
        <AnimatedEntrance
          delay={70}
          style={StyleSheet.flatten([styles.tabs, { backgroundColor: colors.surfaceSecondary }])}
        >
          <TabButton
            label="My tasks"
            active={activeTab === 'mine'}
            onPress={() => selectTab('mine')}
          />
          <TabButton
            label="Open for you"
            active={activeTab === 'open'}
            onPress={() => selectTab('open')}
          />
        </AnimatedEntrance>
      ) : null}

      {activeTab === 'mine' ? (
        <AnimatedEntrance
          delay={90}
          style={StyleSheet.flatten([styles.periodTabs, { borderBottomColor: colors.divider }])}
        >
          <PeriodTab
            label="Current"
            active={mineView === 'current'}
            onPress={() => setMineView('current')}
          />
          <PeriodTab
            label="Previous"
            active={mineView === 'previous'}
            onPress={() => setMineView('previous')}
          />
        </AnimatedEntrance>
      ) : null}

      <AnimatedEntrance key={`${activeTab}-${mineView}`} delay={110} style={styles.list}>
        <View style={styles.boardHeading}>
          <AppText variant="subtitle">
            {activeTab === 'open'
              ? 'Open tasks'
              : mineView === 'previous'
                ? isWorker
                  ? 'Previous work'
                  : 'Previous tasks'
                : isWorker
                  ? 'Current work'
                  : 'Current tasks'}
          </AppText>
          {activeTab === 'open' ? (
            <View style={[styles.viewToggle, { backgroundColor: colors.surfaceSecondary }]}>
              {(['list', 'map'] as OpenView[]).map((view) => (
                <Pressable
                  key={view}
                  onPress={() => setOpenView(view)}
                  style={[
                    styles.viewChoice,
                    openView === view && { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons
                    name={view === 'list' ? 'list-outline' : 'map-outline'}
                    size={18}
                    color={openView === view ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        {activeTab === 'open' ? (
          <View style={[styles.discoveryControls, { borderBottomColor: colors.divider }]}>
            <View style={styles.discoveryHeading}>
              <View>
                <AppText variant="bodyMedium">Search distance</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Nearby opportunities within {radiusKm} km
                </AppText>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: zoneOnly }}
                onPress={() => setZoneOnly((current) => !current)}
                style={[
                  styles.zoneChoice,
                  { backgroundColor: zoneOnly ? colors.primarySoft : colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name={zoneOnly ? 'locate' : 'locate-outline'}
                  size={16}
                  color={zoneOnly ? colors.primary : colors.textMuted}
                />
                <AppText variant="caption" color={zoneOnly ? colors.primary : colors.textSecondary}>
                  This zone only
                </AppText>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.radiusChoices}
            >
              {[5, 15, 30, 50].map((distance) => (
                <Pressable
                  key={distance}
                  accessibilityRole="button"
                  accessibilityState={{ selected: radiusKm === distance }}
                  onPress={() => setRadiusKm(distance)}
                  style={[
                    styles.radiusChoice,
                    {
                      borderColor: radiusKm === distance ? colors.primary : colors.border,
                      backgroundColor: radiusKm === distance ? colors.primarySoft : colors.surface,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    color={radiusKm === distance ? colors.primary : colors.textSecondary}
                  >
                    {distance} km
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        {loading ? <TaskListSkeleton /> : null}
        {error ? (
          <SurfaceCard style={styles.emptyCard}>
            <AppText color={colors.danger}>{error}</AppText>
            <Button label="Try again" variant="secondary" onPress={() => load(0)} />
          </SurfaceCard>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Ionicons
              name={
                activeTab === 'open'
                  ? 'search-outline'
                  : mineView === 'previous'
                    ? 'time-outline'
                    : 'briefcase-outline'
              }
              size={30}
              color={colors.primary}
            />
            <AppText variant="subtitle">
              {activeTab === 'open'
                ? 'No open tasks right now'
                : mineView === 'previous'
                  ? 'No previous tasks yet'
                  : 'No current tasks'}
            </AppText>
            <AppText color={colors.textMuted} style={styles.emptyText}>
              {activeTab === 'open'
                ? 'Check back soon for new opportunities.'
                : mineView === 'previous'
                  ? isWorker
                    ? 'Jobs you complete or cancel will be kept here.'
                    : 'Finished or cancelled tasks will be kept here.'
                  : isWorker
                    ? 'Apply for an open task to see it here.'
                    : 'Post a task to get started.'}
            </AppText>
          </SurfaceCard>
        ) : null}
        {!loading && activeTab === 'open' && openView === 'map' && items.length > 0 ? (
          <OpenTasksMap
            tasks={items}
            workerLocation={workerLocation}
            onSelect={(task) => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
          />
        ) : (
          !loading &&
          items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isWorker={isWorker}
              board={activeTab}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
            />
          ))
        )}
        {hasNext ? (
          <Button
            label="Load more"
            variant="secondary"
            loading={loadingMore}
            onPress={() => load(page + 1)}
          />
        ) : null}
      </AnimatedEntrance>
    </Screen>
  );
}

function PeriodTab({
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
        styles.periodTab,
        { borderBottomColor: active ? colors.primary : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText variant="bodyMedium" color={active ? colors.primary : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
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

function TaskCard({
  task,
  isWorker,
  board,
  onPress,
}: {
  task: TaskCardData;
  isWorker: boolean;
  board: TaskTab;
  onPress(): void;
}) {
  const { colors } = useAppTheme();
  const stage = taskStage(task, isWorker, board);
  const stageTone = {
    primary: { color: colors.primary, background: colors.primarySoft },
    info: { color: colors.info, background: colors.infoSoft },
    warning: { color: colors.warning, background: colors.warningSoft },
    success: { color: colors.success, background: colors.successSoft },
    muted: { color: colors.textMuted, background: colors.surfaceSecondary },
  }[stage.tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${task.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.cardPress, { opacity: pressed ? 0.82 : 1 }]}
    >
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
        </View>
        <DetailRow icon="location-outline" text={task.locationDescription} />
        {task.distanceKm != null ? (
          <DetailRow
            icon="navigate-outline"
            text={`${task.distanceKm.toFixed(1)} km away${
              task.estimatedTravelMinutes != null
                ? ` · about ${task.estimatedTravelMinutes} min`
                : ''
            }`}
          />
        ) : null}
        {task.scheduledStartAt ? (
          <DetailRow
            icon="calendar-outline"
            text={new Date(task.scheduledStartAt).toLocaleString('en-NG')}
          />
        ) : null}
        <View style={[styles.stagePanel, { backgroundColor: stageTone.background }]}>
          <View style={styles.stageProgress}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stageSegment,
                  { backgroundColor: step <= stage.step ? stageTone.color : colors.border },
                ]}
              />
            ))}
          </View>
          <AppText variant="caption" color={stageTone.color}>
            {stage.eyebrow}
          </AppText>
          <AppText variant="bodyMedium">{stage.title}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {stage.detail}
          </AppText>
        </View>
        <View style={[styles.taskFooter, { borderTopColor: colors.divider }]}>
          <View>
            <AppText variant="subtitle">{money(task.acceptedPrice ?? task.budget)}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.primary} />
        </View>
      </SurfaceCard>
    </Pressable>
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
  periodTabs: { flexDirection: 'row', gap: spacing.xl, borderBottomWidth: 1 },
  periodTab: { paddingHorizontal: spacing.xs, paddingBottom: spacing.sm, borderBottomWidth: 2 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  list: { gap: spacing.md },
  boardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewToggle: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  viewChoice: {
    width: 38,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryControls: {
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.lg,
  },
  discoveryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  zoneChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  radiusChoices: { gap: spacing.sm, paddingRight: spacing.lg },
  radiusChoice: {
    minWidth: 62,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyText: { textAlign: 'center' },
  cardPress: { borderRadius: radius.lg },
  taskCard: { gap: spacing.sm },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  taskTitle: { flex: 1, gap: spacing.sm },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stagePanel: { borderRadius: radius.md, padding: spacing.md, gap: 5, marginTop: spacing.xs },
  stageProgress: { flexDirection: 'row', gap: 5, marginBottom: spacing.xs },
  stageSegment: { flex: 1, height: 3, borderRadius: radius.pill },
  taskFooter: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
