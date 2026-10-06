import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Linking,
} from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { MoneyField } from '@/src/components/ui/MoneyField';
import { Screen } from '@/src/components/ui/Screen';
import { TaskDetailSkeleton } from '@/src/components/ui/SkeletonLoader';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthContext';
import type { LocalProfileImage } from '@/src/features/auth/types';
import { TaskAreaMap } from '@/src/features/tasks/TaskAreaMap';
import { TaskJourneyMap } from '@/src/features/tasks/TaskJourneyMap';
import { TaskPhotoPicker } from '@/src/features/tasks/TaskPhotoPicker';
import {
  emergencyContactApi,
  taskApi,
  type Coordinates,
  type TaskBid,
  type TaskDetail,
  type TaskImage,
} from '@/src/features/tasks/task-api';
import { ApiError, kycApi } from '@/src/lib/api';
import { safetyApi } from '@/src/features/safety/safety-api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const money = (amount: number | null) =>
  amount == null
    ? 'To agree'
    : `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
const isOpen = (task: TaskDetail) => task.status === 'POSTED' || task.status === 'BID_RECEIVED';
type BusyAction =
  | 'brief-upload'
  | 'apply'
  | 'accept'
  | 'checkout'
  | 'journey-start'
  | 'journey-arrive'
  | 'journey-stop'
  | 'complete'
  | 'confirm'
  | 'review'
  | 'report-review'
  | 'manual-arrival'
  | 'sos';

const ratingLabels = ['', 'Disappointing', 'Could be better', 'Good', 'Great', 'Excellent'];

function reviewTimeRemaining(deadline: string | null, now: number) {
  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - now;
  if (remaining <= 0) return 'Review window ended';
  const totalMinutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function paymentWording(task: TaskDetail, isOwner: boolean, isAssigned: boolean) {
  switch (task.paymentStatus) {
    case 'INITIALIZED':
      return isOwner
        ? ['Payment awaiting confirmation', 'Complete checkout so the worker can begin safely.']
        : ['Client payment pending', 'Wait for payment confirmation before starting the task.'];
    case 'HELD':
      return isOwner
        ? [
            'Payment protected',
            'Your payment is protected by TaskGrid. It has not been paid to the worker yet.',
          ]
        : [
            'Earnings secured',
            'The client has paid. Your agreed earnings remain protected while you complete the task.',
          ];
    case 'IN_PROGRESS':
      return isOwner
        ? ['Payment protected', 'The worker cannot withdraw this payment while the task is active.']
        : ['Earnings secured', 'The client payment is protected while you complete the task.'];
    case 'COMPLETED':
      return isOwner
        ? [
            'Work ready for review',
            'Review the completion photos before the deadline. Approve the work or open a dispute.',
          ]
        : [
            'Awaiting client review',
            'Your evidence was submitted. If no dispute is opened, the earnings release after the review deadline.',
          ];
    case 'RELEASED':
      return isAssigned
        ? [
            'Earnings available',
            'The earnings have been released and are now included in your available wallet balance.',
          ]
        : [
            'Payment released',
            'The review is complete and the payment is now available to the worker.',
          ];
    case 'PARTIALLY_RELEASED':
      return isAssigned
        ? ['Partial earnings released', 'Your approved portion is now available in your wallet.']
        : [
            'Partial refund completed',
            'The approved worker portion was released and the remaining amount was refunded to you.',
          ];
    case 'DISPUTED':
      return isOwner
        ? [
            'Payment frozen',
            'Your payment remains protected while TaskGrid reviews the dispute. It cannot be released to the worker yet.',
          ]
        : [
            'Earnings frozen',
            'The disputed earnings cannot enter your available balance until TaskGrid resolves the case.',
          ];
    case 'REFUND_PENDING':
      return isOwner
        ? ['Refund processing', 'The case is resolved and Paystack is processing your refund.']
        : [
            'Resolution processing',
            'Your approved portion will become available after the refund is confirmed.',
          ];
    case 'REFUNDED':
      return isOwner
        ? [
            'Refund completed',
            'The resolved amount has been returned to your original payment method.',
          ]
        : ['Payment refunded', 'The case was resolved with this amount returned to the client.'];
    case 'FAILED':
      return isOwner
        ? ['Payment needs attention', 'The payment did not complete. Try again or contact support.']
        : ['Payment not secured', 'Do not begin work until the client payment is confirmed.'];
    case 'CANCELLED':
      return ['Payment cancelled', 'No money will be released for this payment.'];
    default:
      return ['Payment update', 'Refresh for the latest payment status.'];
  }
}

export default function TaskDetailScreen() {
  const { id, paymentReturn, photoUploadFailed } = useLocalSearchParams<{
    id: string;
    paymentReturn?: string;
    photoUploadFailed?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [contactReady, setContactReady] = useState<boolean | null>(null);
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [error, setError] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [eta, setEta] = useState('');
  const [message, setMessage] = useState('');
  const [selectedBid, setSelectedBid] = useState<TaskBid | null>(null);
  const [journeyPromptVisible, setJourneyPromptVisible] = useState(false);
  const [journeyPromptDismissed, setJourneyPromptDismissed] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);
  const [reportReviewVisible, setReportReviewVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [manualArrivalVisible, setManualArrivalVisible] = useState(false);
  const [manualArrivalReason, setManualArrivalReason] = useState('');
  const [sosVisible, setSosVisible] = useState(false);
  const [sosNote, setSosNote] = useState('');
  const [briefPhotos, setBriefPhotos] = useState<LocalProfileImage[]>([]);
  const [completionPhotos, setCompletionPhotos] = useState<LocalProfileImage[]>([]);
  const [lastCoordinate, setLastCoordinate] = useState<Coordinates | null>(null);
  const [reviewClock, setReviewClock] = useState(Date.now());
  const busy = busyAction !== null;

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const next = await taskApi.detail(id);
      setTask(next);
      if (user?.role === 'RUNNER' && isOpen(next)) {
        setContactReady(null);
        setKycVerified(null);
        const [contact, kyc] = await Promise.all([emergencyContactApi.current(), kycApi.status()]);
        setContactReady(Boolean(contact));
        setKycVerified(kyc.status === 'VERIFIED');
      }
      return next;
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't load this task. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const isOwner = task?.clientId === user?.id;
  const isAssigned = task?.assignedRunnerId === user?.id;
  const myBid = task?.bids.find((bid) => bid.runnerId === user?.id);
  const validPrice = /^\d+(?:\.\d{1,2})?$/.test(proposedPrice.trim()) && Number(proposedPrice) > 0;
  const matchesBudget = Boolean(
    task?.budget != null &&
    proposedPrice.trim() &&
    Math.abs(Number(proposedPrice) - task.budget) < 0.005,
  );
  const validEta = /^\d+$/.test(eta.trim()) && Number(eta) > 0 && Number(eta) <= 10080;
  const paymentCopy = task ? paymentWording(task, Boolean(isOwner), Boolean(isAssigned)) : null;
  const paymentSecured = Boolean(
    task?.paymentStatus && ['HELD', 'IN_PROGRESS'].includes(task.paymentStatus),
  );
  const paymentReleased = task?.paymentStatus === 'RELEASED';
  const canReview = Boolean((isOwner || isAssigned) && task?.status === 'PAID' && paymentReleased);
  const mySubmittedReview = task?.myReview ?? null;
  const reviewSubject = isOwner
    ? (task?.assignedRunnerName?.split(' ')[0] ?? 'your worker')
    : (task?.clientName?.split(' ')[0] ?? 'the client');
  const journeyStartRequired = Boolean(
    isAssigned &&
    task?.paymentStatus === 'HELD' &&
    (task.status === 'ACCEPTED' || task.status === 'IN_PROGRESS') &&
    !task.enRouteAt,
  );
  const journeyResumeRequired = Boolean(
    isAssigned &&
    task?.paymentStatus === 'HELD' &&
    task.status === 'EN_ROUTE' &&
    !task.locationSharingEnabled,
  );
  const reviewCountdown = task
    ? reviewTimeRemaining(task.completionReviewDeadlineAt, reviewClock)
    : null;
  const reviewExpired = Boolean(
    task?.completionReviewDeadlineAt &&
    new Date(task.completionReviewDeadlineAt).getTime() <= reviewClock,
  );
  const taskLocation =
    task?.latitude != null && task.longitude != null
      ? { latitude: task.latitude, longitude: task.longitude }
      : null;
  const publicTaskLocation =
    task?.mapLatitude != null && task.mapLongitude != null
      ? { latitude: task.mapLatitude, longitude: task.mapLongitude }
      : null;
  const sharedWorkerLocation =
    task?.runnerLatitude != null && task.runnerLongitude != null
      ? { latitude: task.runnerLatitude, longitude: task.runnerLongitude }
      : null;

  useEffect(() => {
    if (
      !isOwner ||
      !task?.locationSharingEnabled ||
      (task.status !== 'EN_ROUTE' && task.status !== 'ARRIVED')
    )
      return;
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [isOwner, refresh, task?.locationSharingEnabled, task?.status]);

  useEffect(() => {
    if (!task?.completionReviewDeadlineAt || task.status !== 'COMPLETED') return;
    setReviewClock(Date.now());
    const timer = setInterval(() => setReviewClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [task?.completionReviewDeadlineAt, task?.status]);

  useEffect(() => {
    setJourneyPromptDismissed(false);
    setJourneyPromptVisible(false);
    setReviewPromptVisible(false);
    setReviewDismissed(false);
    setReviewRating(0);
    setReviewComment('');
  }, [id]);

  useEffect(() => {
    if (journeyStartRequired && !journeyPromptDismissed) setJourneyPromptVisible(true);
    if (!journeyStartRequired) setJourneyPromptVisible(false);
  }, [journeyPromptDismissed, journeyStartRequired]);

  async function currentCoordinates(): Promise<Coordinates> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Allow location access to use journey check-in.');
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setLastCoordinate(coordinates);
    return coordinates;
  }

  async function journeyAction(action: 'start' | 'arrive' | 'stop') {
    if (!task || busy) return;
    setBusyAction(`journey-${action}`);
    setError('');
    try {
      if (action === 'stop') {
        await taskApi.stopSharing(task.id);
      } else {
        const coordinates = await currentCoordinates();
        if (action === 'start') {
          await taskApi.startJourney(task.id, coordinates);
          setJourneyPromptVisible(false);
        } else await taskApi.arrive(task.id, coordinates);
      }
      await refresh();
    } catch (cause) {
      if (action === 'arrive' && !(cause instanceof ApiError)) {
        setManualArrivalVisible(true);
        setError('');
        return;
      }
      setError(
        cause instanceof ApiError || cause instanceof Error
          ? cause.message
          : "We couldn't update your journey. Try again.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function submitManualArrival() {
    if (!task || manualArrivalReason.trim().length < 10 || busy) return;
    setBusyAction('manual-arrival');
    setError('');
    try {
      await taskApi.arriveManually(task.id, manualArrivalReason);
      setManualArrivalVisible(false);
      setManualArrivalReason('');
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't record your arrival. Contact the client directly.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function sendSos() {
    if (!task || busy) return;
    setBusyAction('sos');
    setError('');
    try {
      const contact = await emergencyContactApi.current();
      if (!contact) {
        setSosVisible(false);
        Alert.alert('Emergency contact required', 'Add a trusted contact before using SOS.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add contact',
            onPress: () => router.push('/emergency-contact'),
          },
        ]);
        return;
      }

      let coordinates: Coordinates | undefined;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      } catch {
        // SOS still sends task and contact context when GPS is unavailable.
      }

      const result = await safetyApi.sendSos({
        taskId: task.id,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        message: sosNote.trim() || undefined,
      });
      setSosVisible(false);
      setSosNote('');
      Alert.alert(
        result.smsDeliveredToProvider ? 'Emergency contact alerted' : 'SMS could not be sent',
        result.message,
        result.smsDeliveredToProvider
          ? [{ text: 'OK' }]
          : [
              { text: 'Close', style: 'cancel' },
              {
                text: `Call ${result.contactName}`,
                onPress: () => void Linking.openURL(`tel:${result.contactPhone}`),
              },
            ],
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't send the SOS alert.");
    } finally {
      setBusyAction(null);
    }
  }

  async function apply() {
    if (!task || !validPrice || !validEta || busy) return;
    setBusyAction('apply');
    setError('');
    try {
      setTask(await taskApi.apply(task.id, Number(proposedPrice), Number(eta), message.trim()));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't send your application. Try again.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function accept() {
    if (!task || !selectedBid || busy) return;
    setBusyAction('accept');
    setError('');
    try {
      setTask(await taskApi.accept(task.id, selectedBid.id));
      setSelectedBid(null);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't accept this worker. Try again.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function checkout() {
    if (!task || busy) return;
    setBusyAction('checkout');
    setError('');
    try {
      const payment = await taskApi.initializePayment(task.id);
      if (
        !payment.checkoutUrl ||
        !/^https:\/\/checkout\.paystack\.com\//i.test(payment.checkoutUrl)
      ) {
        throw new Error('Invalid checkout URL');
      }
      const returnUrl = `taskgridmobile:///task/${task.id}?paymentReturn=true`;
      const browserResult = await WebBrowser.openAuthSessionAsync(payment.checkoutUrl, returnUrl);
      if (browserResult.type === 'success') {
        for (let attempt = 0; attempt < 4; attempt++) {
          const updated = await refresh();
          if (updated?.paymentStatus && updated.paymentStatus !== 'INITIALIZED') break;
          if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      } else {
        await refresh();
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't open secure checkout. Try again.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function addBriefPhotos() {
    if (!task || briefPhotos.length === 0 || busy) return;
    setBusyAction('brief-upload');
    setError('');
    try {
      for (const photo of briefPhotos) {
        await taskApi.uploadBriefImage(task.id, photo);
        setBriefPhotos((current) => current.filter((item) => item.uri !== photo.uri));
      }
      await refresh();
    } catch (cause) {
      await refresh();
      setError(cause instanceof ApiError ? cause.message : "We couldn't upload all task photos.");
    } finally {
      setBusyAction(null);
    }
  }

  async function complete() {
    if (!task || busy) return;
    if ((task.completionImages?.length ?? 0) === 0 && completionPhotos.length === 0) {
      setError('Add at least one clear completion photo before marking the task complete.');
      return;
    }
    setBusyAction('complete');
    setError('');
    try {
      for (const photo of completionPhotos) {
        await taskApi.uploadCompletionImage(task.id, photo);
        setCompletionPhotos((current) => current.filter((item) => item.uri !== photo.uri));
      }
      await taskApi.complete(task.id);
      await refresh();
    } catch (cause) {
      await refresh();
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't mark this task complete. Try again.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function confirm() {
    if (!task || busy) return;
    setBusyAction('confirm');
    setError('');
    try {
      await taskApi.confirm(task.id);
      const updated = await refresh();
      if (updated?.status === 'PAID' && !updated.myReview) {
        setReviewPromptVisible(true);
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't confirm completion. Try again.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function submitReview() {
    if (!task || reviewRating < 1 || busy) return;
    setBusyAction('review');
    setError('');
    try {
      const review = await taskApi.review(task.id, reviewRating, reviewComment);
      setTask((current) =>
        current
          ? {
              ...current,
              myReview: review,
              review: isOwner ? review : current.review,
            }
          : current,
      );
      setReviewComment('');
      setReviewPromptVisible(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't publish your review.");
    } finally {
      setBusyAction(null);
    }
  }

  async function reportReview() {
    if (!task?.review || reportReason.trim().length < 10 || busy) return;
    setBusyAction('report-review');
    setError('');
    try {
      const review = await taskApi.reportReview(task.review.id, reportReason);
      setTask((current) => (current ? { ...current, review } : current));
      setReportReason('');
      setReportReviewVisible(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't report this review.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Screen contentStyle={styles.screen} keyboard>
      <AuthHeader title="Task details" subtitle="Follow this task from application to payment." />
      {loading && !task ? <TaskDetailSkeleton /> : null}
      {error ? (
        <SurfaceCard style={styles.notice}>
          <AppText color={colors.danger}>{error}</AppText>
          <Button label="Refresh task" variant="secondary" onPress={() => void refresh()} />
        </SurfaceCard>
      ) : null}
      {paymentReturn === 'true' && task?.paymentStatus === 'INITIALIZED' ? (
        <SurfaceCard style={styles.notice}>
          <AppText variant="subtitle">Confirming your payment</AppText>
          <AppText color={colors.textSecondary}>
            You’re back in TaskGrid. Paystack is confirming the payment securely. This screen will
            show when the money is held for the task.
          </AppText>
        </SurfaceCard>
      ) : null}
      {photoUploadFailed === 'true' ? (
        <SurfaceCard style={styles.notice}>
          <AppText variant="subtitle">Task posted, but some photos need attention</AppText>
          <AppText color={colors.textSecondary}>
            Your task is live. You can add the remaining photos below while applications are open.
          </AppText>
        </SurfaceCard>
      ) : null}
      {task ? (
        <>
          <AnimatedEntrance>
            <View style={[styles.hero, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.heroOrb, { backgroundColor: colors.primary }]} />
              <AppText variant="eyebrow" color={colors.primary}>
                {task.category}
              </AppText>
              <AppText variant="title" style={styles.heroTitle}>
                {task.title}
              </AppText>
              <AppText color={colors.textSecondary}>{task.locationDescription}</AppText>
              <View style={styles.heroFooter}>
                <View>
                  <AppText variant="caption" color={colors.textMuted}>
                    {task.acceptedPrice ? 'Agreed price' : 'Budget'}
                  </AppText>
                  <AppText variant="title">{money(task.acceptedPrice ?? task.budget)}</AppText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                  <AppText variant="caption" color={colors.primary}>
                    {label(task.status)}
                  </AppText>
                </View>
              </View>
            </View>
          </AnimatedEntrance>
          {publicTaskLocation && !isOwner && !isAssigned ? (
            <AnimatedEntrance delay={35}>
              <TaskAreaMap
                latitude={publicTaskLocation.latitude}
                longitude={publicTaskLocation.longitude}
                zoneName={task.zoneName}
                distanceKm={task.distanceKm}
                estimatedTravelMinutes={task.estimatedTravelMinutes}
                exact={task.exactLocationVisible}
              />
            </AnimatedEntrance>
          ) : null}
          {taskLocation && (isOwner || isAssigned) && task.assignedRunnerId ? (
            <TaskJourneyMap
              taskLocation={taskLocation}
              workerLocation={
                isAssigned ? (lastCoordinate ?? sharedWorkerLocation) : sharedWorkerLocation
              }
              updatedAt={task.runnerLocationUpdatedAt}
              onStopSharing={
                isAssigned && task.locationSharingEnabled
                  ? () => void journeyAction('stop')
                  : undefined
              }
              stopping={busyAction === 'journey-stop'}
            />
          ) : null}
          {(isOwner || isAssigned) && task.assignedRunnerId ? (
            <AnimatedEntrance delay={45} style={styles.participantTools}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open task conversation"
                onPress={() =>
                  router.push({ pathname: '/task/[id]/chat', params: { id: task.id } } as never)
                }
                style={({ pressed }) => [
                  styles.conversationAction,
                  {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.divider,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <View style={styles.conversationCopy}>
                  <AppText variant="eyebrow" color={colors.primary}>
                    Task conversation
                  </AppText>
                  <AppText variant="bodyMedium">
                    Message {isOwner ? reviewSubject : task.clientName.split(' ')[0]}
                  </AppText>
                </View>
                <Ionicons name="arrow-forward" size={21} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open emergency SOS"
                onPress={() => setSosVisible(true)}
                style={({ pressed }) => [
                  styles.sosAction,
                  {
                    backgroundColor: colors.danger,
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <Ionicons name="alert" size={22} color={colors.textOnPrimary} />
                <AppText variant="caption" color={colors.textOnPrimary}>
                  SOS
                </AppText>
              </Pressable>
            </AnimatedEntrance>
          ) : null}
          {journeyStartRequired || journeyResumeRequired ? (
            <AnimatedEntrance delay={50}>
              <LinearGradient
                colors={[colors.primarySoft, colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.journeyNext, { borderColor: `${colors.primary}35` }]}
              >
                <View style={[styles.journeyNumber, { backgroundColor: colors.primary }]}>
                  <AppText variant="subtitle" color={colors.textOnPrimary}>
                    1
                  </AppText>
                </View>
                <AppText variant="eyebrow" color={colors.primary}>
                  Your next step
                </AppText>
                <AppText variant="title" style={styles.journeyNextTitle}>
                  {journeyResumeRequired ? 'Resume journey sharing' : 'Start your journey'}
                </AppText>
                <AppText color={colors.textSecondary} style={styles.journeyNextDescription}>
                  {journeyResumeRequired
                    ? 'Turn location sharing back on so the client can follow your progress and receive your arrival update.'
                    : 'The client has paid. Start your journey before leaving so TaskGrid can guide arrival check-in and keep the client updated.'}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={styles.privacyCopy}>
                  Your location updates only while TaskGrid is open. There is no continuous
                  background tracking, and you can stop sharing at any time.
                </AppText>
                <Button
                  label={journeyResumeRequired ? 'Resume sharing' : 'Start journey'}
                  icon="navigate-outline"
                  onPress={() => void journeyAction('start')}
                  loading={busyAction === 'journey-start'}
                />
              </LinearGradient>
            </AnimatedEntrance>
          ) : null}
          {(isOwner || isAssigned) &&
          task.status === 'ARRIVED' &&
          task.arrivalVerificationMethod === 'MANUAL' ? (
            <View style={[styles.manualArrivalNotice, { borderLeftColor: colors.warning }]}>
              <AppText variant="eyebrow" color={colors.warning}>
                Manual arrival report
              </AppText>
              <AppText color={colors.textSecondary}>
                GPS could not verify this check-in. {task.manualArrivalReason}
              </AppText>
            </View>
          ) : null}
          {isAssigned &&
          task.paymentStatus === 'HELD' &&
          task.status === 'EN_ROUTE' &&
          task.locationSharingEnabled ? (
            <View style={[styles.arrivalPrompt, { borderBottomColor: colors.divider }]}>
              <View style={styles.arrivalCopy}>
                <AppText variant="eyebrow" color={colors.primary}>
                  At the task location?
                </AppText>
                <AppText color={colors.textSecondary}>
                  Check in when you are close enough to the destination.
                </AppText>
              </View>
              <Button
                label="I've arrived"
                icon="location-outline"
                onPress={() => void journeyAction('arrive')}
                loading={busyAction === 'journey-arrive'}
              />
            </View>
          ) : null}
          <AnimatedEntrance delay={60}>
            <View style={[styles.taskOverview, { borderBottomColor: colors.divider }]}>
              <View style={styles.overviewHeading}>
                <AppText variant="subtitle">What needs doing</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {task.urgencyLevel === 'HIGH'
                    ? 'Soon'
                    : task.urgencyLevel === 'EMERGENCY'
                      ? 'Emergency'
                      : 'Flexible'}
                </AppText>
              </View>
              <AppText color={colors.textSecondary} style={styles.description}>
                {task.description}
              </AppText>
              {task.scheduledStartAt ? (
                <AppText variant="caption" color={colors.textMuted}>
                  Scheduled: {new Date(task.scheduledStartAt).toLocaleString('en-NG')}
                </AppText>
              ) : null}
              {isOwner && task.assignedRunnerName ? (
                <AppText variant="bodyMedium">Worker: {task.assignedRunnerName}</AppText>
              ) : isAssigned ? (
                <AppText variant="bodyMedium">Client: {task.clientName}</AppText>
              ) : null}
            </View>
          </AnimatedEntrance>

          {(task.briefImages?.length ?? 0) > 0 ? (
            <TaskImageGallery title="Task photos" images={task.briefImages} />
          ) : null}

          {isOwner && isOpen(task) ? (
            <SurfaceCard style={styles.form}>
              <TaskPhotoPicker
                label="Add task photos"
                helper="Optional. Help workers see the job clearly before quoting."
                images={briefPhotos}
                onChange={setBriefPhotos}
                onError={setError}
                existingCount={task.briefImages?.length ?? 0}
              />
              {briefPhotos.length > 0 ? (
                <Button
                  label="Upload selected photos"
                  onPress={addBriefPhotos}
                  loading={busyAction === 'brief-upload'}
                />
              ) : null}
            </SurfaceCard>
          ) : null}

          {task.paymentStatus &&
          !(task.status === 'COMPLETED' && task.paymentStatus === 'COMPLETED') ? (
            paymentSecured ? (
              <AnimatedEntrance delay={80}>
                <LinearGradient
                  colors={[colors.successSoft, colors.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.securedPayment, { borderColor: `${colors.success}35` }]}
                >
                  <View
                    pointerEvents="none"
                    style={[styles.securedGlow, { backgroundColor: colors.success }]}
                  />
                  <View style={styles.securedHeader}>
                    <AppText variant="eyebrow" color={colors.success}>
                      Protected payment
                    </AppText>
                    <View style={[styles.securedSeal, { backgroundColor: colors.success }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
                    </View>
                  </View>

                  <AppText variant="display" style={styles.securedAmount}>
                    {money(task.acceptedPrice ?? task.budget)}
                  </AppText>
                  <AppText variant="subtitle">
                    {isOwner ? 'Your payment is secured' : 'Your earnings are secured'}
                  </AppText>
                  <AppText color={colors.textSecondary} style={styles.securedDescription}>
                    {paymentCopy?.[1]}
                  </AppText>

                  <View style={[styles.paymentJourney, { borderTopColor: colors.divider }]}>
                    <View style={styles.journeyStep}>
                      <View style={styles.journeyMarker}>
                        <View style={[styles.journeyDot, { backgroundColor: colors.success }]} />
                        <View style={[styles.journeyLine, { backgroundColor: colors.success }]} />
                      </View>
                      <View style={styles.journeyCopy}>
                        <AppText variant="bodyMedium">Payment received</AppText>
                        <AppText variant="caption" color={colors.textMuted}>
                          Safely held for this task
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.journeyStep}>
                      <View style={styles.journeyMarker}>
                        <View
                          style={[
                            styles.journeyDot,
                            styles.journeyDotPending,
                            {
                              borderColor: colors.textMuted,
                              backgroundColor: colors.surface,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.journeyCopy}>
                        <AppText variant="bodyMedium">
                          {isOwner ? 'Release after your approval' : 'Available after approval'}
                        </AppText>
                        <AppText variant="caption" color={colors.textMuted}>
                          After the work is completed and reviewed
                        </AppText>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </AnimatedEntrance>
            ) : paymentReleased ? (
              <AnimatedEntrance delay={80}>
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.releasedPayment}
                >
                  <View pointerEvents="none" style={styles.releasedRingLarge} />
                  <View pointerEvents="none" style={styles.releasedRingSmall} />
                  <View style={styles.releasedHeader}>
                    <AppText variant="eyebrow" color="#FFFFFFD9">
                      Task settled
                    </AppText>
                    <View style={styles.releasedCheck}>
                      <Ionicons name="checkmark" size={25} color={colors.primary} />
                    </View>
                  </View>

                  <AppText variant="display" color="#FFFFFF" style={styles.releasedAmount}>
                    {money(task.acceptedPrice ?? task.budget)}
                  </AppText>
                  <AppText variant="title" color="#FFFFFF" style={styles.releasedTitle}>
                    {isOwner ? 'Payment released' : 'Earnings are ready'}
                  </AppText>
                  <AppText color="#FFFFFFD9" style={styles.releasedDescription}>
                    {paymentCopy?.[1]}
                  </AppText>

                  <View style={styles.releasedDestination}>
                    <View style={styles.releasedDestinationCopy}>
                      <AppText variant="caption" color="#FFFFFFB8">
                        {isOwner ? 'Released to' : 'Available balance'}
                      </AppText>
                      <AppText variant="bodyMedium" color="#FFFFFF">
                        {isOwner
                          ? (task.assignedRunnerName ?? 'Your worker')
                          : 'Ready in your TaskGrid wallet'}
                      </AppText>
                    </View>
                    <Ionicons name="checkmark-circle" size={25} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </AnimatedEntrance>
            ) : (
              <SurfaceCard style={styles.paymentCard}>
                <Ionicons name="shield-checkmark-outline" size={23} color={colors.primary} />
                <View style={styles.paymentCopy}>
                  <AppText variant="bodyMedium">{paymentCopy?.[0]}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {paymentCopy?.[1]}
                  </AppText>
                </View>
              </SurfaceCard>
            )
          ) : null}

          {canReview && !mySubmittedReview && !reviewDismissed ? (
            <AnimatedEntrance delay={120}>
              <LinearGradient
                colors={[colors.warningSoft, colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.reviewInvitation, { borderColor: `${colors.warning}35` }]}
              >
                <Ionicons
                  pointerEvents="none"
                  name="star-outline"
                  size={142}
                  color={colors.warning}
                  style={styles.reviewWatermark}
                />
                <AppText variant="eyebrow" color={colors.warning}>
                  One last thing
                </AppText>
                <AppText variant="title" style={styles.reviewInvitationTitle}>
                  How was working with {reviewSubject}?
                </AppText>
                <AppText color={colors.textSecondary} style={styles.reviewInvitationLead}>
                  {isOwner
                    ? 'Your honest review helps future clients make informed choices. Leaving one is completely optional.'
                    : 'Your feedback helps TaskGrid recognise clear, respectful clients. Leaving one is completely optional.'}
                </AppText>

                <View
                  style={styles.starChooser}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={`${isOwner ? 'Worker' : 'Client'} star rating`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      accessibilityRole="radio"
                      accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`}
                      accessibilityState={{ checked: reviewRating === star }}
                      onPress={() => setReviewRating(star)}
                      hitSlop={4}
                      style={({ pressed }) => [
                        styles.starChoice,
                        { transform: [{ scale: pressed ? 0.88 : 1 }] },
                      ]}
                    >
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={38}
                        color={colors.warning}
                      />
                    </Pressable>
                  ))}
                </View>
                <AppText
                  variant="bodyMedium"
                  color={reviewRating > 0 ? colors.warning : colors.textMuted}
                  style={styles.ratingLabel}
                >
                  {reviewRating > 0 ? ratingLabels[reviewRating] : 'Tap a star to rate the work'}
                </AppText>

                <TextField
                  label="Write a review (optional)"
                  placeholder={
                    isOwner
                      ? 'What stood out about the work or communication?'
                      : 'How clear were the instructions and communication?'
                  }
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  maxLength={1000}
                />
                <AppText variant="caption" color={colors.textMuted} style={styles.reviewCountText}>
                  {reviewComment.length}/1000
                </AppText>
                <Button
                  label="Publish review"
                  icon="paper-plane-outline"
                  disabled={reviewRating < 1}
                  loading={busyAction === 'review'}
                  onPress={() => void submitReview()}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setReviewDismissed(true)}
                  style={({ pressed }) => [styles.notNowReview, { opacity: pressed ? 0.55 : 1 }]}
                >
                  <AppText variant="bodyMedium" color={colors.textMuted}>
                    Not now
                  </AppText>
                </Pressable>
              </LinearGradient>
            </AnimatedEntrance>
          ) : null}

          {canReview && !mySubmittedReview && reviewDismissed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setReviewDismissed(false)}
              style={({ pressed }) => [
                styles.leaveReviewLater,
                {
                  borderBottomColor: colors.divider,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.leaveReviewCopy}>
                <AppText variant="eyebrow" color={colors.warning}>
                  Optional
                </AppText>
                <AppText variant="bodyMedium">Leave a review for {reviewSubject}</AppText>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </Pressable>
          ) : null}

          {task.review && (isOwner || isAssigned) ? (
            <AnimatedEntrance delay={100}>
              <View style={[styles.publishedReview, { borderColor: colors.divider }]}>
                <View style={styles.publishedReviewHeading}>
                  <View>
                    <AppText variant="eyebrow" color={colors.primary}>
                      {isOwner ? 'Your review' : 'Client review'}
                    </AppText>
                    <AppText variant="subtitle">
                      {task.review.moderationStatus === 'REMOVED'
                        ? 'Review removed'
                        : `${task.review.rating} out of 5`}
                    </AppText>
                  </View>
                  {task.review.moderationStatus !== 'REMOVED' ? (
                    <View style={styles.publishedStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= task.review!.rating ? 'star' : 'star-outline'}
                          size={18}
                          color={colors.warning}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
                {task.review.moderationStatus === 'REMOVED' ? (
                  <AppText color={colors.textMuted}>
                    This review is no longer included in the worker’s public reputation.
                  </AppText>
                ) : task.review.comment ? (
                  <AppText color={colors.textSecondary} style={styles.publishedComment}>
                    “{task.review.comment}”
                  </AppText>
                ) : (
                  <AppText color={colors.textMuted}>No written comment was added.</AppText>
                )}
                {isAssigned &&
                task.review.moderationStatus !== 'FLAGGED' &&
                task.review.moderationStatus !== 'UNDER_REVIEW' &&
                task.review.moderationStatus !== 'REMOVED' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setReportReviewVisible(true)}
                    style={({ pressed }) => [
                      styles.reportReviewAction,
                      { opacity: pressed ? 0.55 : 1 },
                    ]}
                  >
                    <AppText variant="caption" color={colors.danger}>
                      Report abusive or inappropriate content
                    </AppText>
                  </Pressable>
                ) : null}
                {isAssigned &&
                (task.review.moderationStatus === 'FLAGGED' ||
                  task.review.moderationStatus === 'UNDER_REVIEW') ? (
                  <AppText variant="caption" color={colors.warning}>
                    This review has been sent to TaskGrid for moderation and is excluded from your
                    public rating while it is checked.
                  </AppText>
                ) : null}
              </View>
            </AnimatedEntrance>
          ) : null}

          {isAssigned && mySubmittedReview ? (
            <AnimatedEntrance delay={120}>
              <View style={[styles.publishedReview, { borderColor: colors.divider }]}>
                <View style={styles.publishedReviewHeading}>
                  <View>
                    <AppText variant="eyebrow" color={colors.primary}>
                      Your review of {reviewSubject}
                    </AppText>
                    <AppText variant="subtitle">{mySubmittedReview.rating} out of 5</AppText>
                  </View>
                  <View style={styles.publishedStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= mySubmittedReview.rating ? 'star' : 'star-outline'}
                        size={18}
                        color={colors.warning}
                      />
                    ))}
                  </View>
                </View>
                {mySubmittedReview.comment ? (
                  <AppText color={colors.textSecondary} style={styles.publishedComment}>
                    “{mySubmittedReview.comment}”
                  </AppText>
                ) : (
                  <AppText color={colors.textMuted}>No written comment was added.</AppText>
                )}
              </View>
            </AnimatedEntrance>
          ) : null}

          {task.status === 'COMPLETED' && task.paymentStatus === 'COMPLETED' && reviewCountdown ? (
            <AnimatedEntrance delay={100}>
              <View style={[styles.reviewExperience, { borderLeftColor: colors.warning }]}>
                <AppText variant="eyebrow" color={colors.warning}>
                  {isOwner ? 'Your review window' : 'Client review in progress'}
                </AppText>
                <AppText variant="display" style={styles.reviewCountdown}>
                  {reviewCountdown}
                </AppText>
                <AppText color={colors.textSecondary} style={styles.reviewLead}>
                  {isOwner
                    ? reviewExpired
                      ? 'The review window has closed. Automatic payment release is being processed.'
                      : `${task.assignedRunnerName ?? 'The worker'} has submitted completion evidence. Approve the work or open a dispute before this timer ends.`
                    : reviewExpired
                      ? 'The review window has closed. Your earnings will become available after automatic release is processed.'
                      : `${task.clientName} can now review your evidence. Your earnings remain protected and will release automatically if no dispute is opened.`}
                </AppText>

                <View style={[styles.reviewRule, { backgroundColor: colors.divider }]} />
                <View style={styles.reviewDates}>
                  <View style={styles.reviewDateColumn}>
                    <AppText variant="caption" color={colors.textMuted}>
                      Submitted
                    </AppText>
                    <AppText variant="bodyMedium">
                      {task.runnerCompletedAt
                        ? new Date(task.runnerCompletedAt).toLocaleString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Recently'}
                    </AppText>
                  </View>
                  <View style={styles.reviewDateColumn}>
                    <AppText variant="caption" color={colors.textMuted}>
                      Review closes
                    </AppText>
                    <AppText variant="bodyMedium">
                      {new Date(task.completionReviewDeadlineAt!).toLocaleString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </AppText>
                  </View>
                </View>
                <AppText variant="caption" color={colors.textMuted}>
                  {isOwner
                    ? 'Approving releases the payment immediately. Opening a dispute freezes it for TaskGrid review.'
                    : 'Released earnings appear in your wallet. A dispute freezes the payment until TaskGrid records a decision.'}
                </AppText>
              </View>
            </AnimatedEntrance>
          ) : null}

          {(task.completionImages?.length ?? 0) > 0 ? (
            <TaskImageGallery title="Finished work" images={task.completionImages} />
          ) : null}

          {isOwner && isOpen(task) ? (
            <View style={styles.section}>
              <AppText variant="subtitle">Applications ({task.bids.length})</AppText>
              {task.bids.length === 0 ? (
                <SurfaceCard>
                  <AppText color={colors.textMuted}>
                    No applications yet. You’ll be able to compare prices and choose a worker here.
                  </AppText>
                </SurfaceCard>
              ) : (
                task.bids.map((bid, index) => (
                  <Pressable
                    key={bid.id}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${bid.runnerName}'s application`}
                    onPress={() => setSelectedBid(bid)}
                    style={({ pressed }) => [
                      styles.bidRow,
                      {
                        borderBottomColor: colors.divider,
                        opacity: pressed ? 0.72 : 1,
                        borderBottomWidth:
                          index === task.bids.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.bidAvatar, { backgroundColor: colors.primarySoft }]}>
                      {bid.runnerPictureUrl ? (
                        <Image
                          source={{ uri: bid.runnerPictureUrl }}
                          style={styles.bidAvatarImage}
                        />
                      ) : (
                        <AppText variant="subtitle" color={colors.primary}>
                          {bid.runnerName.charAt(0).toUpperCase()}
                        </AppText>
                      )}
                    </View>
                    <View style={styles.bidSummary}>
                      <AppText variant="bodyMedium">{bid.runnerName}</AppText>
                      <View style={styles.inlineMeta}>
                        <Ionicons name="star" size={14} color={colors.warning} />
                        <AppText variant="caption" color={colors.textSecondary}>
                          {bid.averageRating && bid.averageRating > 0
                            ? bid.averageRating.toFixed(1)
                            : 'New'}
                          {'  ·  '}
                          {bid.etaMinutes} min away
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.bidPrice}>
                      <AppText variant="bodyMedium">{money(bid.proposedPrice)}</AppText>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}

          {user?.role === 'RUNNER' && isOpen(task) ? (
            <View style={styles.section}>
              {myBid ? (
                <SurfaceCard style={styles.notice}>
                  <Ionicons name="checkmark-circle-outline" size={27} color={colors.success} />
                  <AppText variant="subtitle">Application sent</AppText>
                  <AppText color={colors.textSecondary}>
                    Your proposed price: {money(myBid.proposedPrice)}. Status: {label(myBid.status)}
                    .
                  </AppText>
                </SurfaceCard>
              ) : kycVerified === null || contactReady === null ? (
                <SurfaceCard style={styles.notice}>
                  <AppText color={colors.textSecondary}>
                    Checking your account readiness. Refresh if this takes too long.
                  </AppText>
                </SurfaceCard>
              ) : !kycVerified ? (
                <SurfaceCard style={styles.notice}>
                  <AppText variant="subtitle">Verify your identity first</AppText>
                  <Button
                    label="Go to verification"
                    variant="secondary"
                    onPress={() => router.push('/(tabs)/profile/kyc')}
                  />
                </SurfaceCard>
              ) : !contactReady ? (
                <SurfaceCard style={styles.notice}>
                  <AppText variant="subtitle">Add your emergency contact first</AppText>
                  <Button
                    label="Add contact"
                    variant="secondary"
                    onPress={() => router.push('/emergency-contact')}
                  />
                </SurfaceCard>
              ) : (
                <SurfaceCard style={styles.form}>
                  <AppText variant="subtitle">Apply for this task</AppText>
                  <MoneyField
                    label="Your price"
                    value={proposedPrice}
                    onChangeText={setProposedPrice}
                    labelAccessory={
                      task.budget != null ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Use the client's budget of ${money(task.budget)}`}
                          accessibilityState={{ selected: matchesBudget }}
                          onPress={() => setProposedPrice(task.budget!.toFixed(2))}
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.useBudgetAction,
                            { opacity: pressed ? 0.55 : 1 },
                          ]}
                        >
                          {matchesBudget ? (
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          ) : null}
                          <AppText variant="caption" color={colors.primary}>
                            Same as budget
                          </AppText>
                        </Pressable>
                      ) : null
                    }
                  />
                  <TextField
                    label="How soon can you arrive? (minutes)"
                    keyboardType="number-pad"
                    placeholder="e.g. 60"
                    value={eta}
                    onChangeText={setEta}
                  />
                  <TextField
                    label="Short message (optional)"
                    placeholder="Why you're a good fit"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={1000}
                  />
                  <Button
                    label="Send application"
                    onPress={apply}
                    disabled={!validPrice || !validEta}
                    loading={busyAction === 'apply'}
                  />
                </SurfaceCard>
              )}
            </View>
          ) : null}

          {isOwner &&
          task.status === 'ACCEPTED' &&
          (!task.paymentStatus || task.paymentStatus === 'INITIALIZED') ? (
            <SurfaceCard style={styles.form}>
              <AppText variant="subtitle">Pay securely to start</AppText>
              <AppText color={colors.textSecondary}>
                You’ll pay {money(task.acceptedPrice)} through Paystack. The worker can start only
                after payment is confirmed.
              </AppText>
              <Button
                label={task.paymentStatus ? 'Continue checkout' : 'Pay for task'}
                onPress={checkout}
                loading={busyAction === 'checkout'}
              />
            </SurfaceCard>
          ) : null}
          {isAssigned &&
          task.paymentStatus === 'HELD' &&
          ['EN_ROUTE', 'ARRIVED'].includes(task.status) ? (
            <SurfaceCard style={styles.form}>
              <AppText variant="subtitle">Submit completed work</AppText>
              <AppText color={colors.textSecondary}>
                Add at least one clear after-photo. The client and TaskGrid support can compare it
                with the original task photos if there is a problem.
              </AppText>
              <TaskPhotoPicker
                label="Completion photos (required)"
                helper="Add up to 5 photos, no more than 20 MB altogether."
                images={completionPhotos}
                onChange={setCompletionPhotos}
                onError={setError}
                existingCount={task.completionImages?.length ?? 0}
              />
              <Button
                label="Upload and mark complete"
                onPress={complete}
                loading={busyAction === 'complete'}
                disabled={
                  (task.completionImages?.length ?? 0) === 0 && completionPhotos.length === 0
                }
              />
            </SurfaceCard>
          ) : null}
          {isOwner && task.status === 'COMPLETED' && task.paymentStatus === 'COMPLETED' ? (
            <View style={[styles.reviewActions, { borderTopColor: colors.divider }]}>
              <AppText variant="eyebrow" color={colors.primary}>
                Your decision
              </AppText>
              <AppText variant="subtitle">Does the finished work match the task?</AppText>
              <AppText color={colors.textSecondary}>
                Confirming releases {money(task.acceptedPrice)} to{' '}
                {task.assignedRunnerName ?? 'the worker'}. Only continue when you are satisfied.
              </AppText>
              <Button
                label="Confirm completion"
                onPress={confirm}
                loading={busyAction === 'confirm'}
              />
              {!reviewExpired ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/dispute/${task.id}` as never)}
                  style={({ pressed }) => [styles.disputeLink, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <AppText variant="bodyMedium" color={colors.danger}>
                    Having an issue with this task? Open a dispute
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {(isOwner || isAssigned) &&
          !task.disputeStatus &&
          ['ACCEPTED', 'IN_PROGRESS', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'].includes(task.status) &&
          task.paymentStatus &&
          ['HELD', 'IN_PROGRESS', 'COMPLETED'].includes(task.paymentStatus) &&
          !(task.status === 'COMPLETED' && reviewExpired) &&
          !(isOwner && task.status === 'COMPLETED' && task.paymentStatus === 'COMPLETED') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/dispute/${task.id}` as never)}
              style={({ pressed }) => [styles.disputeLink, { opacity: pressed ? 0.6 : 1 }]}
            >
              <AppText variant="bodyMedium" color={colors.danger}>
                Having an issue with this task? Open a dispute
              </AppText>
            </Pressable>
          ) : null}
          {task.disputeStatus && (isOwner || isAssigned) ? (
            <Button
              label="View dispute details"
              variant="secondary"
              icon="document-text-outline"
              onPress={() => router.push(`/dispute/${task.id}` as never)}
            />
          ) : null}
          {isAssigned && task.status === 'ACCEPTED' && task.paymentStatus !== 'HELD' ? (
            <AppText color={colors.textMuted}>
              Waiting for the client’s payment to be confirmed before work begins.
            </AppText>
          ) : null}
          <Button
            label="Refresh status"
            variant="ghost"
            icon="refresh-outline"
            onPress={() => void refresh()}
            loading={loading}
          />
        </>
      ) : null}

      <Modal
        visible={Boolean(selectedBid)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBid(null)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedBid(null)} />
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.applicantSheet}
            >
              <View style={styles.applicantHero}>
                <View style={[styles.applicantAvatar, { backgroundColor: colors.primarySoft }]}>
                  {selectedBid?.runnerPictureUrl ? (
                    <Image
                      source={{ uri: selectedBid.runnerPictureUrl }}
                      style={styles.bidAvatarImage}
                    />
                  ) : (
                    <AppText variant="display" color={colors.primary}>
                      {selectedBid?.runnerName.charAt(0).toUpperCase()}
                    </AppText>
                  )}
                </View>
                <AppText variant="title" style={styles.applicantName}>
                  {selectedBid?.runnerName}
                </AppText>
                <AppText color={colors.textSecondary}>
                  {selectedBid?.primarySkill ?? 'TaskGrid worker'}
                </AppText>
                {selectedBid?.identityVerified ? (
                  <View style={styles.identitySignal}>
                    <Ionicons name="shield-checkmark" size={17} color={colors.success} />
                    <AppText variant="bodyMedium" color={colors.success}>
                      Identity verified
                    </AppText>
                  </View>
                ) : null}
                <AppText variant="caption" color={colors.textMuted} style={styles.identityNote}>
                  Identity verification checks submitted details. It does not guarantee safety or
                  job quality.
                </AppText>
              </View>

              <View style={[styles.trustStrip, { borderColor: colors.divider }]}>
                <View style={styles.trustMetric}>
                  <AppText variant="subtitle">
                    {selectedBid?.averageRating && selectedBid.averageRating > 0
                      ? selectedBid.averageRating.toFixed(1)
                      : 'New'}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    Rating
                  </AppText>
                </View>
                <View style={styles.trustMetric}>
                  <AppText variant="subtitle">{selectedBid?.reviewCount ?? 0}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {(selectedBid?.reviewCount ?? 0) === 1 ? 'Review' : 'Reviews'}
                  </AppText>
                </View>
                <View style={styles.trustMetric}>
                  <AppText variant="subtitle">{selectedBid?.totalJobs ?? 0}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    Completed jobs
                  </AppText>
                </View>
                <View style={styles.trustMetric}>
                  <AppText variant="subtitle">{selectedBid?.etaMinutes ?? 0}m</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    Arrival
                  </AppText>
                </View>
              </View>

              <View style={[styles.proposalBand, { backgroundColor: colors.primarySoft }]}>
                <View>
                  <AppText variant="caption" color={colors.textMuted}>
                    Proposed price
                  </AppText>
                  <AppText variant="title">{money(selectedBid?.proposedPrice ?? null)}</AppText>
                </View>
                <Ionicons name="receipt-outline" size={28} color={colors.primary} />
              </View>

              {selectedBid?.message ? (
                <View style={styles.editorialSection}>
                  <AppText variant="eyebrow" color={colors.primary}>
                    Message
                  </AppText>
                  <AppText color={colors.textSecondary}>“{selectedBid.message}”</AppText>
                </View>
              ) : null}

              <View style={styles.editorialSection}>
                <AppText variant="eyebrow" color={colors.primary}>
                  Approximate location
                </AppText>
                {selectedBid?.approximateDistanceKm != null || selectedBid?.approximateLocation ? (
                  <AppText color={colors.textSecondary}>
                    {selectedBid.approximateLocation ?? 'Location shared'}
                    {selectedBid.approximateDistanceKm != null
                      ? ` · about ${selectedBid.approximateDistanceKm.toFixed(1)} km from this task`
                      : ''}
                  </AppText>
                ) : (
                  <AppText color={colors.textMuted}>
                    This worker has not shared a recent discovery location.
                  </AppText>
                )}
              </View>

              {(selectedBid?.skills.length ?? 0) > 0 ? (
                <View style={styles.editorialSection}>
                  <AppText variant="eyebrow" color={colors.primary}>
                    Other skills
                  </AppText>
                  <View style={styles.skillWrap}>
                    {selectedBid?.skills.map((skill) => (
                      <View
                        key={skill}
                        style={[styles.skillChip, { backgroundColor: colors.surfaceSecondary }]}
                      >
                        <AppText variant="caption">{skill}</AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.editorialSection}>
                <AppText variant="eyebrow" color={colors.primary}>
                  Recent reviews
                </AppText>
                {(selectedBid?.recentReviews.length ?? 0) === 0 ? (
                  <AppText color={colors.textMuted}>
                    No reviews yet. This may be their first TaskGrid job.
                  </AppText>
                ) : (
                  selectedBid?.recentReviews.map((review, index) => (
                    <View
                      key={`${review.createdAt}-${index}`}
                      style={[styles.reviewLine, { borderBottomColor: colors.divider }]}
                    >
                      <View style={styles.reviewHeading}>
                        <AppText variant="bodyMedium">
                          {review.reviewerFirstName ?? 'Client'}
                        </AppText>
                        <AppText variant="caption" color={colors.warning}>
                          {'★'.repeat(review.rating)}
                        </AppText>
                      </View>
                      {review.comment ? (
                        <AppText color={colors.textSecondary}>{review.comment}</AppText>
                      ) : null}
                    </View>
                  ))
                )}
              </View>

              {selectedBid?.status === 'PENDING' ? (
                <Button
                  label={`Choose ${selectedBid.runnerName.split(' ')[0]}`}
                  onPress={accept}
                  loading={busyAction === 'accept'}
                />
              ) : (
                <AppText color={colors.textMuted}>
                  This application is {label(selectedBid?.status ?? '')}.
                </AppText>
              )}
              <Button label="Close" variant="ghost" onPress={() => setSelectedBid(null)} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(reviewPromptVisible && isOwner && canReview && !mySubmittedReview)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setReviewPromptVisible(false);
          setReviewDismissed(true);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.journeyPromptOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Close review prompt"
              onPress={() => {
                setReviewPromptVisible(false);
                setReviewDismissed(true);
              }}
            />
            <View style={[styles.reviewPrompt, { backgroundColor: colors.surface }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close review prompt"
                hitSlop={10}
                onPress={() => {
                  setReviewPromptVisible(false);
                  setReviewDismissed(true);
                }}
                style={({ pressed }) => [
                  styles.journeyPromptClose,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.reviewPromptContent}
              >
                <View style={[styles.reviewPromptSeal, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="star" size={34} color={colors.warning} />
                </View>
                <AppText variant="eyebrow" color={colors.success}>
                  Task completed
                </AppText>
                <AppText variant="title" style={styles.reviewPromptTitle}>
                  How was {reviewSubject}'s work?
                </AppText>
                <AppText color={colors.textSecondary} style={styles.reviewPromptDescription}>
                  Your feedback helps other clients choose with confidence. A written comment is
                  optional.
                </AppText>

                <View
                  style={styles.reviewPromptStars}
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Worker star rating"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      accessibilityRole="radio"
                      accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`}
                      accessibilityState={{ checked: reviewRating === star }}
                      onPress={() => setReviewRating(star)}
                      hitSlop={3}
                      style={({ pressed }) => [
                        styles.reviewPromptStar,
                        { transform: [{ scale: pressed ? 0.86 : 1 }] },
                      ]}
                    >
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={38}
                        color={colors.warning}
                      />
                    </Pressable>
                  ))}
                </View>
                <AppText variant="bodyMedium" color={colors.warning} style={styles.ratingLabel}>
                  {reviewRating > 0 ? ratingLabels[reviewRating] : 'Tap a star to rate the work'}
                </AppText>

                <TextField
                  label="Add a comment (optional)"
                  keyboardAware={false}
                  placeholder="What stood out about the work or communication?"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  maxLength={1000}
                />
                <AppText variant="caption" color={colors.textMuted} style={styles.reviewCountText}>
                  {reviewComment.length}/1000
                </AppText>
                <Button
                  label="Publish review"
                  icon="paper-plane-outline"
                  disabled={reviewRating < 1}
                  loading={busyAction === 'review'}
                  onPress={() => void submitReview()}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setReviewPromptVisible(false);
                    setReviewDismissed(true);
                  }}
                  style={({ pressed }) => [styles.notYetAction, { opacity: pressed ? 0.55 : 1 }]}
                >
                  <AppText variant="bodyMedium" color={colors.textMuted}>
                    Not now
                  </AppText>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={reportReviewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportReviewVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.overlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setReportReviewVisible(false)}
            />
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.reportSheet}>
                <AppText variant="eyebrow" color={colors.danger}>
                  Review moderation
                </AppText>
                <AppText variant="title">Tell us what needs to be checked</AppText>
                <AppText color={colors.textSecondary}>
                  Report personal abuse, harassment, irrelevant claims or other inappropriate
                  content. The review will be excluded from your public rating while TaskGrid checks
                  it.
                </AppText>
                <TextField
                  label="Reason"
                  keyboardAware={false}
                  placeholder="Explain the specific problem with this review"
                  value={reportReason}
                  onChangeText={setReportReason}
                  multiline
                  maxLength={500}
                />
                <AppText variant="caption" color={colors.textMuted} style={styles.reviewCountText}>
                  {reportReason.length}/500
                </AppText>
                <Button
                  label="Send for moderation"
                  disabled={reportReason.trim().length < 10}
                  loading={busyAction === 'report-review'}
                  onPress={() => void reportReview()}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setReportReviewVisible(false)}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={manualArrivalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !busy && setManualArrivalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.journeyPromptOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => !busy && setManualArrivalVisible(false)}
            />
            <View style={[styles.reviewPrompt, { backgroundColor: colors.surface }]}>
              <View style={[styles.manualArrivalIcon, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="location-outline" size={30} color={colors.warning} />
              </View>
              <AppText variant="eyebrow" color={colors.warning}>
                GPS fallback
              </AppText>
              <AppText variant="title">Report your arrival manually?</AppText>
              <AppText color={colors.textSecondary} style={styles.reviewPromptDescription}>
                Use this only when you are at the task location but your phone cannot obtain a GPS
                position. The client will be told that the arrival was not GPS verified.
              </AppText>
              <TextField
                label="What went wrong with GPS?"
                keyboardAware={false}
                placeholder="For example, GPS is unavailable inside the building"
                value={manualArrivalReason}
                onChangeText={setManualArrivalReason}
                multiline
                maxLength={500}
              />
              <Button
                label="Report arrival"
                icon="checkmark-circle-outline"
                disabled={manualArrivalReason.trim().length < 10}
                loading={busyAction === 'manual-arrival'}
                onPress={() => void submitManualArrival()}
              />
              <Button
                label="Cancel"
                variant="ghost"
                disabled={busy}
                onPress={() => setManualArrivalVisible(false)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={sosVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !busy && setSosVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.journeyPromptOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => !busy && setSosVisible(false)}
            />
            <View style={[styles.reviewPrompt, { backgroundColor: colors.surface }]}>
              <View style={[styles.sosSeal, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="alert" size={34} color={colors.danger} />
              </View>
              <AppText variant="eyebrow" color={colors.danger}>
                Emergency SOS
              </AppText>
              <AppText variant="title">Alert your trusted contact</AppText>
              <AppText color={colors.textSecondary} style={styles.reviewPromptDescription}>
                TaskGrid will send your saved emergency contact this task and your current location
                when available. This does not contact police or replace local emergency services.
              </AppText>
              <TextField
                label="Short note (optional)"
                keyboardAware={false}
                placeholder="Add anything your contact should know"
                value={sosNote}
                onChangeText={setSosNote}
                multiline
                maxLength={500}
              />
              <Button
                label="Send SOS alert"
                variant="danger"
                icon="alert-circle-outline"
                loading={busyAction === 'sos'}
                onPress={() => void sendSos()}
              />
              <Button
                label="Cancel"
                variant="ghost"
                disabled={busy}
                onPress={() => setSosVisible(false)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={journeyPromptVisible && journeyStartRequired}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setJourneyPromptVisible(false);
          setJourneyPromptDismissed(true);
        }}
      >
        <View style={styles.journeyPromptOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close journey reminder"
            onPress={() => {
              setJourneyPromptVisible(false);
              setJourneyPromptDismissed(true);
            }}
          />
          <View style={[styles.journeyPrompt, { backgroundColor: colors.surface }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close journey reminder"
              hitSlop={10}
              onPress={() => {
                setJourneyPromptVisible(false);
                setJourneyPromptDismissed(true);
              }}
              style={({ pressed }) => [
                styles.journeyPromptClose,
                {
                  backgroundColor: colors.surfaceSecondary,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>

            <View style={styles.journeyArtwork}>
              <View style={[styles.routePoint, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="shield-checkmark" size={25} color={colors.success} />
              </View>
              <View style={styles.routePath}>
                <View style={[styles.routeLine, { backgroundColor: colors.primary }]} />
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </View>
              <View style={[styles.routePoint, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="navigate" size={25} color={colors.primary} />
              </View>
            </View>

            <AppText variant="eyebrow" color={colors.success}>
              Payment confirmed
            </AppText>
            <AppText variant="title" style={styles.journeyPromptTitle}>
              Start your journey before you leave
            </AppText>
            <AppText color={colors.textSecondary} style={styles.journeyPromptDescription}>
              This starts the task journey and lets the client know you are on the way. Your
              location is shared only while this task is active.
            </AppText>
            <Button
              label="Start journey"
              icon="navigate-outline"
              onPress={() => void journeyAction('start')}
              loading={busyAction === 'journey-start'}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setJourneyPromptVisible(false);
                setJourneyPromptDismissed(true);
              }}
              style={({ pressed }) => [styles.notYetAction, { opacity: pressed ? 0.55 : 1 }]}
            >
              <AppText variant="bodyMedium" color={colors.textMuted}>
                Not leaving yet
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function TaskImageGallery({ title, images }: { title: string; images: TaskImage[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.gallerySection}>
      <View style={styles.galleryHeading}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {images.length} {images.length === 1 ? 'photo' : 'photos'}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gallery}
      >
        {images.map((image) => (
          <Image key={image.id} source={{ uri: image.url }} style={styles.taskImage} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  hero: {
    minHeight: 224,
    gap: spacing.sm,
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  heroOrb: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -85,
    top: -90,
    opacity: 0.12,
  },
  heroTitle: { maxWidth: '88%' },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginTop: 'auto',
  },
  journeyNext: {
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  journeyNumber: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNextTitle: { maxWidth: '82%' },
  journeyNextDescription: {
    maxWidth: 340,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  arrivalPrompt: {
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  arrivalCopy: { gap: spacing.xs },
  taskOverview: {
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  overviewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  description: { fontSize: 16, lineHeight: 25 },
  card: { gap: spacing.lg },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  paymentCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  paymentCopy: { flex: 1, gap: spacing.xs },
  releasedPayment: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 310,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  releasedRingLarge: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderWidth: 34,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 105,
    right: -95,
    top: -72,
  },
  releasedRingSmall: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderWidth: 18,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 41,
    left: -32,
    bottom: 48,
  },
  releasedHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  releasedCheck: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  releasedAmount: { fontSize: 36, lineHeight: 44, marginTop: spacing.sm },
  releasedTitle: { marginTop: spacing.xs },
  releasedDescription: { maxWidth: 330, lineHeight: 22, marginTop: spacing.sm },
  releasedDestination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 'auto',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  releasedDestinationCopy: { flex: 1, gap: 3 },
  securedPayment: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  securedGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -82,
    top: -86,
    opacity: 0.1,
  },
  securedHeader: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  securedSeal: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securedAmount: { fontSize: 34, lineHeight: 42, marginTop: spacing.sm },
  securedDescription: { maxWidth: 330, lineHeight: 21, marginTop: spacing.xs },
  paymentJourney: {
    gap: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
    marginTop: spacing.xl,
  },
  journeyStep: { minHeight: 58, flexDirection: 'row', gap: spacing.md },
  journeyMarker: { width: 16, alignItems: 'center' },
  journeyDot: { width: 11, height: 11, borderRadius: 6 },
  journeyDotPending: { borderWidth: 2 },
  journeyLine: {
    width: 2,
    flex: 1,
    minHeight: 35,
    marginVertical: 4,
    opacity: 0.42,
  },
  journeyCopy: { flex: 1, gap: 2, paddingBottom: spacing.md },
  participantTools: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  conversationAction: {
    flex: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  conversationCopy: { flex: 1, gap: 3 },
  sosAction: {
    width: 76,
    minHeight: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  privacyCopy: { lineHeight: 19 },
  manualArrivalNotice: {
    gap: spacing.xs,
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
  },
  reviewInvitation: {
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  reviewWatermark: {
    position: 'absolute',
    right: -34,
    top: -34,
    opacity: 0.08,
    transform: [{ rotate: '14deg' }],
  },
  reviewInvitationTitle: { maxWidth: '86%', lineHeight: 31 },
  reviewInvitationLead: {
    maxWidth: 340,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  starChooser: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  starChoice: { paddingVertical: spacing.xs },
  ratingLabel: { textAlign: 'center', minHeight: 22, marginBottom: spacing.sm },
  reviewCountText: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  notNowReview: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  leaveReviewLater: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  leaveReviewCopy: { flex: 1, gap: 3 },
  publishedReview: {
    gap: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xl,
  },
  publishedReviewHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  publishedStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  publishedComment: { fontSize: 17, lineHeight: 27 },
  reportReviewAction: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  reviewExperience: {
    gap: spacing.md,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    marginVertical: spacing.sm,
  },
  reviewCountdown: { maxWidth: 310, fontSize: 31, lineHeight: 38 },
  reviewLead: { fontSize: 16, lineHeight: 25 },
  reviewRule: { height: StyleSheet.hairlineWidth, marginTop: spacing.sm },
  reviewDates: { gap: spacing.lg, paddingTop: spacing.xs },
  reviewDateColumn: { gap: 2 },
  reviewActions: {
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xl,
    marginTop: spacing.sm,
  },
  disputeLink: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  section: { gap: spacing.md },
  bidCard: { gap: spacing.md },
  bidRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  bidAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidAvatarImage: { width: '100%', height: '100%' },
  bidSummary: { flex: 1, gap: 4 },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bidPrice: { alignItems: 'flex-end', gap: spacing.xs },
  form: { gap: spacing.lg },
  useBudgetAction: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
  },
  notice: { gap: spacing.md },
  gallerySection: { gap: spacing.sm },
  galleryHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gallery: { gap: spacing.sm, paddingRight: spacing.lg },
  taskImage: { width: 148, height: 116, borderRadius: radius.lg },
  modalKeyboard: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7,13,30,0.65)',
  },
  modal: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  journeyPromptOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(7,13,30,0.72)',
  },
  journeyPrompt: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  reviewPrompt: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    alignSelf: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  reviewPromptContent: { gap: spacing.md, paddingBottom: spacing.xs },
  reviewPromptSeal: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  manualArrivalIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosSeal: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewPromptTitle: { maxWidth: 320, lineHeight: 31 },
  reviewPromptDescription: { lineHeight: 22, marginBottom: spacing.xs },
  reviewPromptStars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  reviewPromptStar: { paddingVertical: spacing.xs },
  journeyPromptClose: {
    position: 'absolute',
    zIndex: 2,
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyArtwork: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingRight: spacing.xxl,
    marginBottom: spacing.sm,
  },
  routePoint: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePath: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  routeLine: { flex: 1, height: 2, borderRadius: 1, opacity: 0.45 },
  journeyPromptTitle: { maxWidth: 320, lineHeight: 31 },
  journeyPromptDescription: { lineHeight: 22, marginBottom: spacing.sm },
  notYetAction: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reportSheet: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  applicantSheet: {
    gap: spacing.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  applicantHero: { alignItems: 'center', gap: spacing.xs },
  applicantAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  applicantName: { textAlign: 'center' },
  identitySignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  identityNote: {
    maxWidth: 310,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  trustStrip: {
    minHeight: 154,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.lg,
  },
  trustMetric: { width: '45%', justifyContent: 'center', gap: 2 },
  proposalBand: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  editorialSection: { gap: spacing.sm },
  skillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  reviewLine: {
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  reviewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
