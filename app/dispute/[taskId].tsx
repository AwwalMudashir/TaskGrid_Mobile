import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { DisputeDetailSkeleton } from '@/src/components/ui/SkeletonLoader';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthContext';
import type { LocalProfileImage } from '@/src/features/auth/types';
import { TaskPhotoPicker } from '@/src/features/tasks/TaskPhotoPicker';
import { taskApi, type TaskDetail, type TaskDispute } from '@/src/features/tasks/task-api';
import { ApiError } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const CLIENT_REASONS = [
  { code: 'WORK_NOT_COMPLETE', label: 'Work is incomplete' },
  { code: 'QUALITY_NOT_AS_AGREED', label: 'Quality is not as agreed' },
  { code: 'WORKER_ABANDONED_TASK', label: 'Worker stopped or did not arrive' },
  { code: 'DAMAGE_OR_SAFETY_CONCERN', label: 'Damage or safety concern' },
  { code: 'OTHER', label: 'Something else' },
];

const WORKER_REASONS = [
  { code: 'SCOPE_CHANGED', label: 'The requested work changed' },
  { code: 'UNSAFE_WORK_CONDITIONS', label: 'The work conditions are unsafe' },
  { code: 'CLIENT_UNAVAILABLE', label: 'The client is unavailable' },
  { code: 'CLIENT_CONDUCT', label: 'Problem with client conduct' },
  {
    code: 'PAYMENT_OR_COMPLETION_DISAGREEMENT',
    label: 'Payment or completion disagreement',
  },
  { code: 'OTHER', label: 'Something else' },
];

const OPEN_TASK_STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'];
const PROTECTED_PAYMENT_STATUSES = ['HELD', 'IN_PROGRESS', 'COMPLETED'];

const displayLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());

const money = (amount: number | null) =>
  amount == null
    ? 'Not set'
    : `\u20A6${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TaskDisputeScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [dispute, setDispute] = useState<TaskDispute | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [statement, setStatement] = useState('');
  const [evidence, setEvidence] = useState<LocalProfileImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [closePromptVisible, setClosePromptVisible] = useState(false);

  const isClient = user?.role === 'CLIENT';
  const reasons = isClient ? CLIENT_REASONS : WORKER_REASONS;
  const ownStatement = isClient ? dispute?.clientStatement : dispute?.runnerStatement;
  const ownEvidenceCount = isClient
    ? (dispute?.clientEvidenceUrls.length ?? 0)
    : (dispute?.runnerEvidenceUrls.length ?? 0);
  const acceptsContributions = dispute
    ? !['RESOLUTION_PENDING', 'RESOLVED', 'CLOSED'].includes(dispute.status)
    : false;
  const disputeClosed = dispute?.status === 'CLOSED';
  const canClose = Boolean(
    dispute &&
    dispute.raisedById === user?.id &&
    !['RESOLUTION_PENDING', 'RESOLVED', 'CLOSED'].includes(dispute.status),
  );
  const canOpen = useMemo(
    () =>
      Boolean(
        task &&
        OPEN_TASK_STATUSES.includes(task.status) &&
        task.paymentStatus &&
        PROTECTED_PAYMENT_STATUSES.includes(task.paymentStatus) &&
        !(
          task.status === 'COMPLETED' &&
          task.completionReviewDeadlineAt &&
          new Date(task.completionReviewDeadlineAt).getTime() <= Date.now()
        ),
      ),
    [task],
  );

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError('');
    try {
      const nextTask = await taskApi.detail(taskId);
      setTask(nextTask);
      setDispute(nextTask.disputeStatus ? await taskApi.dispute(taskId) : null);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't load this case. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadSelected(current: TaskDispute) {
    if (!taskId) return { latest: current, complete: false };
    let latest = current;
    let uploaded = 0;
    for (const image of evidence) {
      try {
        latest = await taskApi.uploadDisputeEvidence(taskId, image);
        uploaded += 1;
      } catch {
        break;
      }
    }
    const complete = uploaded === evidence.length;
    setEvidence(complete ? [] : evidence.slice(uploaded));
    if (!complete) {
      setNotice(
        `${uploaded} of ${evidence.length} evidence photos uploaded. You can retry the remaining photos.`,
      );
    }
    return { latest, complete };
  }

  async function submitNewDispute() {
    if (!taskId || !reasonCode || statement.trim().length < 20 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let next = await taskApi.openDispute(taskId, reasonCode, statement.trim());
      if (evidence.length) next = (await uploadSelected(next)).latest;
      setDispute(next);
      setTask((current) =>
        current
          ? {
              ...current,
              status: 'DISPUTED',
              paymentStatus: 'DISPUTED',
              disputeStatus: next.status,
            }
          : current,
      );
      setStatement('');
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't open this dispute. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function contribute() {
    if (!taskId || !dispute || busy) return;
    if (!ownStatement && statement.trim().length < 20) return;
    if (ownStatement && evidence.length === 0) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let next = ownStatement ? dispute : await taskApi.respondToDispute(taskId, statement.trim());
      const upload = evidence.length ? await uploadSelected(next) : null;
      if (upload) next = upload.latest;
      setDispute(next);
      setStatement('');
      if (!upload || upload.complete) setNotice('Your information has been added to the case.');
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't update this case. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function closeDispute() {
    if (!taskId || !dispute || !canClose || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await taskApi.closeDispute(taskId);
      setDispute(next);
      setTask((current) =>
        current
          ? {
              ...current,
              status: next.taskStatus,
              paymentStatus: next.paymentStatus,
              disputeStatus: next.status,
            }
          : current,
      );
      setClosePromptVisible(false);
      setNotice('The dispute is closed and the normal task flow has resumed.');
    } catch (cause) {
      setClosePromptVisible(false);
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't close this dispute. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen contentStyle={styles.screen}>
        <AuthHeader title="Dispute details" subtitle="Loading protected payment review" />
        <DisputeDetailSkeleton />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen} keyboard>
      <AuthHeader
        title={dispute ? 'Dispute details' : 'Open a dispute'}
        subtitle={task?.title ?? 'Protected payment review'}
        onBackPress={() => router.back()}
      />

      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      {notice ? <AppText color={colors.success}>{notice}</AppText> : null}

      {dispute ? (
        <>
          <View
            style={[
              styles.caseHero,
              {
                backgroundColor: disputeClosed ? colors.successSoft : colors.warningSoft,
              },
            ]}
          >
            <View style={[styles.shield, { backgroundColor: colors.surface }]}>
              <Ionicons
                name={disputeClosed ? 'checkmark-circle-outline' : 'shield-checkmark-outline'}
                size={28}
                color={disputeClosed ? colors.success : colors.warning}
              />
            </View>
            <AppText variant="eyebrow" color={disputeClosed ? colors.success : colors.warning}>
              {displayLabel(dispute.status)}
            </AppText>
            <AppText variant="title">
              {disputeClosed ? 'This dispute is closed' : 'The payment is protected'}
            </AppText>
            <AppText color={colors.textSecondary}>
              {disputeClosed
                ? 'The person who opened the case closed it. The normal task and payment flow has resumed.'
                : 'No release or refund can happen until TaskGrid records a decision.'}
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText variant="subtitle">Case summary</AppText>
            <AppText variant="bodyMedium">{displayLabel(dispute.reasonCode)}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Opened by {dispute.raisedByName} on{' '}
              {new Date(dispute.createdAt).toLocaleString('en-NG')}
            </AppText>
          </View>

          <PartyEvidence
            title="Client's account"
            statement={dispute.clientStatement}
            urls={dispute.clientEvidenceUrls}
          />
          <PartyEvidence
            title="Worker's account"
            statement={dispute.runnerStatement}
            urls={dispute.runnerEvidenceUrls}
          />

          {acceptsContributions ? (
            <View style={styles.section}>
              <AppText variant="subtitle">
                {ownStatement ? 'Add more evidence' : 'Add your account'}
              </AppText>
              {!ownStatement ? (
                <TextField
                  label="Your explanation"
                  placeholder="Explain what happened and what outcome you believe is fair."
                  value={statement}
                  onChangeText={setStatement}
                  multiline
                  maxLength={4000}
                  style={styles.statement}
                  error={
                    statement.length > 0 && statement.trim().length < 20
                      ? 'Please add at least 20 characters.'
                      : undefined
                  }
                />
              ) : null}
              <TaskPhotoPicker
                label="Supporting photos"
                helper="Optional. Add clear photos that help explain your side."
                images={evidence}
                onChange={setEvidence}
                onError={setError}
                existingCount={ownEvidenceCount}
              />
              <Button
                label={ownStatement ? 'Upload evidence' : 'Send response'}
                onPress={contribute}
                loading={busy}
                disabled={ownStatement ? evidence.length === 0 : statement.trim().length < 20}
              />
            </View>
          ) : null}

          {canClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close this dispute"
              onPress={() => setClosePromptVisible(true)}
              style={({ pressed }) => [
                styles.closeAction,
                {
                  borderTopColor: colors.divider,
                  borderBottomColor: colors.divider,
                  opacity: pressed ? 0.62 : 1,
                },
              ]}
            >
              <View style={styles.closeActionCopy}>
                <AppText variant="bodyMedium" color={colors.danger}>
                  Close this dispute
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Use this only if the issue is resolved or the dispute was opened by mistake.
                </AppText>
              </View>
              <Ionicons name="close-circle-outline" size={24} color={colors.danger} />
            </Pressable>
          ) : null}

          {dispute.finalOutcome ? (
            <SurfaceCard style={styles.section}>
              <AppText variant="eyebrow" color={colors.success}>
                Final decision
              </AppText>
              <AppText variant="subtitle">{displayLabel(dispute.finalOutcome)}</AppText>
              {dispute.resolutionNote ? (
                <AppText color={colors.textSecondary}>{dispute.resolutionNote}</AppText>
              ) : null}
              <View style={styles.amountRow}>
                <Amount label="Worker receives" value={money(dispute.workerReleaseAmount)} />
                <Amount label="Client refund" value={money(dispute.clientRefundAmount)} />
              </View>
            </SurfaceCard>
          ) : null}

          <View style={styles.section}>
            <AppText variant="subtitle">Case activity</AppText>
            {(dispute.history ?? []).map((entry, index) => (
              <View
                key={entry.id ?? `${entry.eventType}-${entry.createdAt}`}
                style={styles.historyRow}
              >
                <View style={styles.historyRail}>
                  <View style={[styles.historyDot, { backgroundColor: colors.primary }]} />
                  {index < (dispute.history?.length ?? 0) - 1 ? (
                    <View style={[styles.historyLine, { backgroundColor: colors.divider }]} />
                  ) : null}
                </View>
                <View style={styles.historyCopy}>
                  <AppText variant="bodyMedium">{displayLabel(entry.eventType)}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {entry.actorName}
                  </AppText>
                  {entry.note ? (
                    <AppText variant="caption" color={colors.textMuted}>
                      {entry.note}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color={colors.textMuted}>
                    {new Date(entry.createdAt).toLocaleString('en-NG')}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : canOpen ? (
        <>
          <View style={styles.intro}>
            <View style={[styles.largeIcon, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="chatbox-ellipses-outline" size={34} color={colors.danger} />
            </View>
            <AppText variant="title">Tell us what happened</AppText>
            <AppText color={colors.textSecondary}>
              Opening a dispute immediately freezes the protected payment while TaskGrid reviews
              both sides and the evidence.
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText variant="subtitle">Choose the main issue</AppText>
            <View style={styles.reasonList}>
              {reasons.map((reason) => {
                const selected = reasonCode === reason.code;
                return (
                  <Pressable
                    key={reason.code}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setReasonCode(reason.code)}
                    style={[styles.reason, { borderBottomColor: colors.divider }]}
                  >
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {selected ? (
                        <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />
                      ) : null}
                    </View>
                    <AppText variant="bodyMedium" color={selected ? colors.primary : colors.text}>
                      {reason.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextField
            label="Explain the issue"
            placeholder="Describe what happened and what outcome you believe is fair."
            value={statement}
            onChangeText={setStatement}
            multiline
            maxLength={4000}
            style={styles.statement}
            error={
              statement.length > 0 && statement.trim().length < 20
                ? 'Please add at least 20 characters.'
                : undefined
            }
          />

          <TaskPhotoPicker
            label="Supporting photos"
            helper="Optional. The original task and completion photos are already included."
            images={evidence}
            onChange={setEvidence}
            onError={setError}
          />

          <Button
            label="Open dispute and protect payment"
            variant="danger"
            icon="shield-outline"
            onPress={submitNewDispute}
            loading={busy}
            disabled={!reasonCode || statement.trim().length < 20}
          />
        </>
      ) : (
        <SurfaceCard style={styles.section}>
          <AppText variant="subtitle">A dispute cannot be opened now</AppText>
          <AppText color={colors.textSecondary}>
            Disputes are available to the assigned client and worker while payment is protected and
            has not been released.
          </AppText>
          <Button label="Return to task" onPress={() => router.back()} />
        </SurfaceCard>
      )}

      <Modal
        visible={closePromptVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !busy && setClosePromptVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Keep dispute open"
            onPress={() => !busy && setClosePromptVisible(false)}
          />
          <View style={[styles.closePrompt, { backgroundColor: colors.surface }]}>
            <View style={[styles.closePromptMark, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="alert-outline" size={28} color={colors.danger} />
            </View>
            <AppText variant="title">Close this dispute?</AppText>
            <AppText color={colors.textSecondary} style={styles.closePromptCopy}>
              Closing removes the dispute freeze and returns the task and payment to their previous
              stage. Any remaining completion-review countdown will resume. This dispute cannot be
              reopened.
            </AppText>
            <View style={styles.closePromptActions}>
              <View style={styles.flex}>
                <Button
                  label="Keep open"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setClosePromptVisible(false)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Close dispute"
                  variant="danger"
                  loading={busy}
                  onPress={closeDispute}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function PartyEvidence({
  title,
  statement,
  urls,
}: {
  title: string;
  statement: string | null;
  urls: string[];
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <AppText variant="subtitle">{title}</AppText>
      <AppText color={statement ? colors.textSecondary : colors.textMuted}>
        {statement ?? 'No statement has been submitted yet.'}
      </AppText>
      {urls.length ? (
        <View style={styles.photoGrid}>
          {urls.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.photo} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.flex}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="bodyMedium">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  section: { gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  intro: { gap: spacing.sm, paddingVertical: spacing.sm },
  largeIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseHero: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  shield: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  reasonList: { gap: 0 },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 54,
    borderBottomWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  statement: {
    minHeight: 132,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 84, height: 84, borderRadius: radius.md },
  amountRow: { flexDirection: 'row', gap: spacing.xl, paddingTop: spacing.sm },
  historyRow: { flexDirection: 'row', gap: spacing.md, minHeight: 70 },
  historyRail: { width: 18, alignItems: 'center' },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  historyLine: { width: 1, flex: 1, marginTop: 4 },
  historyCopy: { flex: 1, gap: 2, paddingBottom: spacing.md },
  closeAction: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  closeActionCopy: { flex: 1, gap: 3 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(4, 11, 24, 0.66)',
  },
  closePrompt: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  closePromptMark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePromptCopy: { lineHeight: 22 },
  closePromptActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
