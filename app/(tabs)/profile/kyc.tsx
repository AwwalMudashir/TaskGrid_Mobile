import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthContext';
import { launchDojahKyc } from '@/src/features/kyc/dojah';
import type { DojahLaunchResult, KycStatus, KycStatusResult } from '@/src/features/kyc/types';
import { ApiError, kycApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme, type AppColors } from '@/src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const statusContent: Record<
  KycStatus,
  {
    title: string;
    description: string;
    icon: IconName;
    tone: keyof Pick<AppColors, 'primary' | 'success' | 'warning' | 'danger' | 'info'>;
  }
> = {
  UNVERIFIED: {
    title: 'Verify your identity',
    description: 'Complete a quick identity check before taking jobs on TaskGrid.',
    icon: 'finger-print-outline',
    tone: 'primary',
  },
  PENDING: {
    title: 'Verification in progress',
    description: 'Your details are being checked. Most test checks update within a few moments.',
    icon: 'hourglass-outline',
    tone: 'warning',
  },
  VERIFIED: {
    title: 'Identity verified',
    description: 'Your worker profile has passed TaskGrid identity verification.',
    icon: 'shield-checkmark-outline',
    tone: 'success',
  },
  REJECTED: {
    title: 'Verification unsuccessful',
    description: 'We could not approve this attempt. Review the reason before continuing.',
    icon: 'close-circle-outline',
    tone: 'danger',
  },
  APPEALING: {
    title: 'Appeal under review',
    description: 'The TaskGrid team will review your explanation and verification result.',
    icon: 'document-text-outline',
    tone: 'info',
  },
  SUSPENDED: {
    title: 'Verification suspended',
    description: 'This identity check needs attention from the TaskGrid support team.',
    icon: 'alert-circle-outline',
    tone: 'danger',
  },
};

function errorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (/native module|DojahKycSdk|Expo Go/i.test(message)) {
    return 'Dojah verification needs a TaskGrid development build and cannot open inside Expo Go.';
  }
  return cause instanceof ApiError || cause instanceof Error
    ? cause.message
    : 'Identity verification could not be loaded. Please try again.';
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatScore(value: number | null) {
  if (value === null) return null;
  const percentage = value <= 1 ? value * 100 : value;
  return `${Math.round(percentage)}%`;
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
      <View style={[styles.smallIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <AppText color={colors.textSecondary} style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

function Requirement({ icon, title, copy }: { icon: IconName; title: string; copy: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.requirement}>
      <View style={[styles.requirementIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.requirementCopy}>
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {copy}
        </AppText>
      </View>
      <Ionicons name="checkmark-circle" size={19} color={colors.success} />
    </View>
  );
}

export default function KycScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const [result, setResult] = useState<KycStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [checkingResult, setCheckingResult] = useState(false);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealing, setAppealing] = useState(false);

  const loadStatus = useCallback(async () => {
    if (user?.role !== 'RUNNER') {
      setLoading(false);
      return;
    }
    setError('');
    try {
      setResult(await kycApi.status());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  async function refreshAfterWidget(widgetResult: DojahLaunchResult) {
    if (widgetResult === 'closed' || widgetResult === 'unknown') {
      setNotice(
        widgetResult === 'closed'
          ? 'The Dojah window closed before a result was submitted. Your progress may still be saved; tap Continue verification to resume.'
          : 'Dojah closed without returning a verification result. Tap Continue verification to resume this attempt.',
      );
      return;
    }

    setCheckingResult(true);
    setError('');
    try {
      try {
        setResult(await kycApi.sync());
      } catch {
        setResult(await kycApi.status());
      }
      setNotice('Your verification status has been refreshed from Dojah.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setCheckingResult(false);
    }
  }

  async function beginVerification() {
    if (!user) return;
    if (result?.status === 'UNVERIFIED' && !consented) {
      setError('Tick the consent box before starting identity verification.');
      return;
    }

    setLaunching(true);
    setError('');
    setNotice('');
    try {
      const session = await kycApi.startSession();
      const widgetResult = await launchDojahKyc(session, user);
      await refreshAfterWidget(widgetResult);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLaunching(false);
    }
  }

  async function refreshStatus() {
    setCheckingResult(true);
    setError('');
    setNotice('');
    try {
      setResult(result?.referenceId ? await kycApi.sync() : await kycApi.status());
      setNotice('Your latest verification status is now shown.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setCheckingResult(false);
    }
  }

  async function submitAppeal() {
    const reason = appealReason.trim();
    if (reason.length < 15) {
      setError('Please explain the problem in at least 15 characters.');
      return;
    }
    setAppealing(true);
    setError('');
    try {
      setResult(await kycApi.appeal(reason));
      setShowAppeal(false);
      setNotice('Your appeal has been sent to the TaskGrid review team.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setAppealing(false);
    }
  }

  if (user?.role !== 'RUNNER') {
    return (
      <Screen contentStyle={styles.screen}>
        <AuthHeader title="Identity verification" />
        <NoticeCard tone="info" icon="information-circle-outline" title="Worker-only check">
          KYC is only required for worker accounts. Your client account does not need this step.
        </NoticeCard>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen contentStyle={styles.screen}>
        <AuthHeader title="Identity verification" />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText color={colors.textSecondary}>Loading your verification status…</AppText>
        </View>
      </Screen>
    );
  }

  if (checkingResult) {
    return (
      <Screen contentStyle={styles.screen}>
        <AuthHeader title="Identity verification" onBackPress={() => undefined} />
        <View style={styles.loadingState}>
          <View style={[styles.checkingOrb, { backgroundColor: colors.primarySoft }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <AppText variant="title" style={styles.centerText}>
            Checking your result
          </AppText>
          <AppText color={colors.textSecondary} style={styles.centerText}>
            TaskGrid is securely refreshing the latest status from Dojah. Keep this screen open.
          </AppText>
        </View>
      </Screen>
    );
  }

  const status = result?.status ?? 'UNVERIFIED';
  const content = statusContent[status];
  const toneColor = colors[content.tone];
  const toneSoft =
    content.tone === 'primary' ? colors.primarySoft : colors[`${content.tone}Soft` as const];
  const completedDate = formatDate(result?.completedAt ?? null);
  const submittedDate = formatDate(result?.submittedAt ?? null);
  const livenessScore = formatScore(result?.livenessScore ?? null);
  const imageMatchScore = formatScore(result?.imageMatchScore ?? null);

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader title="Identity verification" subtitle="Powered securely by Dojah" />

      <AnimatedEntrance style={styles.hero}>
        <View style={[styles.heroIconRing, { backgroundColor: toneSoft }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name={content.icon} size={39} color={toneColor} />
          </View>
        </View>
        <View style={styles.heroCopy}>
          <AppText variant="title" style={styles.centerText}>
            {content.title}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.centerText}>
            {content.description}
          </AppText>
        </View>
      </AnimatedEntrance>

      {error ? (
        <NoticeCard tone="danger" icon="alert-circle-outline" title="Something needs attention">
          {error}
        </NoticeCard>
      ) : null}
      {notice ? (
        <NoticeCard tone="info" icon="refresh-circle-outline">
          {notice}
        </NoticeCard>
      ) : null}

      {status === 'UNVERIFIED' ? (
        <AnimatedEntrance delay={80} style={styles.section}>
          <SurfaceCard style={styles.requirementsCard}>
            <View style={styles.cardHeading}>
              <AppText variant="subtitle">What you’ll need</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Usually takes about 3–5 minutes
              </AppText>
            </View>
            <Requirement
              icon="card-outline"
              title="A valid government ID"
              copy="Use the ID type requested in the Dojah test flow."
            />
            <Requirement
              icon="camera-outline"
              title="A clear selfie"
              copy="Good lighting helps the liveness and face-match check."
            />
            <Requirement
              icon="phone-portrait-outline"
              title="Camera access"
              copy="Dojah will ask for permission only when the check begins."
            />
          </SurfaceCard>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consented }}
            onPress={() => {
              setConsented((value) => !value);
              setError('');
            }}
            style={styles.consentRow}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: consented ? colors.primary : colors.surface,
                  borderColor: consented ? colors.primary : colors.border,
                },
              ]}
            >
              {consented ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </View>
            <AppText variant="caption" color={colors.textSecondary} style={styles.consentCopy}>
              I consent to Dojah processing my ID and selfie for identity verification. TaskGrid
              stores only the result and masked identity details.
            </AppText>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/privacy-policy')}>
            <AppText variant="bodyMedium" color={colors.primary} style={styles.policyLink}>
              Read the Privacy Policy
            </AppText>
          </Pressable>
          <Button
            label="Begin verification"
            icon="shield-checkmark-outline"
            onPress={beginVerification}
            loading={launching}
          />
          <AppText variant="caption" color={colors.textMuted} style={styles.centerText}>
            Use the test identity details provided for this verification.
          </AppText>
        </AnimatedEntrance>
      ) : null}

      {status === 'PENDING' ? (
        <AnimatedEntrance delay={80} style={styles.section}>
          <SurfaceCard style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark" size={18} color={colors.success} />
              </View>
              <View style={styles.timelineCopy}>
                <AppText variant="bodyMedium">Verification started</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {submittedDate ?? 'Your secure attempt has been created'}
                </AppText>
              </View>
            </View>
            <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: colors.warningSoft }]}>
                <ActivityIndicator size="small" color={colors.warning} />
              </View>
              <View style={styles.timelineCopy}>
                <AppText variant="bodyMedium">Dojah review</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {result?.providerStatus ?? 'Waiting for your verification steps'}
                </AppText>
              </View>
            </View>
          </SurfaceCard>
          <Button
            label="Continue verification"
            icon="open-outline"
            onPress={beginVerification}
            loading={launching}
          />
          <Button
            label="Refresh status"
            icon="refresh-outline"
            variant="secondary"
            onPress={refreshStatus}
          />
        </AnimatedEntrance>
      ) : null}

      {status === 'VERIFIED' ? (
        <AnimatedEntrance delay={80} style={styles.section}>
          <NoticeCard tone="success" icon="checkmark-circle-outline" title="You’re ready to work">
            Your verified badge can now be used as a trust signal on TaskGrid.
          </NoticeCard>
          <SurfaceCard style={styles.detailsCard}>
            <AppText variant="subtitle">Verification details</AppText>
            {result?.idType ? (
              <DetailRow icon="card-outline" label="ID type" value={result.idType} />
            ) : null}
            {result?.maskedIdValue ? (
              <DetailRow icon="eye-off-outline" label="ID number" value={result.maskedIdValue} />
            ) : null}
            {livenessScore ? (
              <DetailRow icon="scan-outline" label="Liveness" value={livenessScore} />
            ) : null}
            {imageMatchScore ? (
              <DetailRow icon="people-outline" label="Face match" value={imageMatchScore} />
            ) : null}
            {completedDate ? (
              <DetailRow icon="calendar-outline" label="Completed" value={completedDate} />
            ) : null}
          </SurfaceCard>
          <Button
            label="Refresh result"
            icon="refresh-outline"
            variant="secondary"
            onPress={refreshStatus}
          />
        </AnimatedEntrance>
      ) : null}

      {status === 'REJECTED' ? (
        <AnimatedEntrance delay={80} style={styles.section}>
          <NoticeCard tone="danger" icon="information-circle-outline" title="Why it was rejected">
            {result?.failureReason ??
              'Dojah could not verify this attempt. Make sure your ID is clear and your selfie is well lit.'}
          </NoticeCard>

          {showAppeal ? (
            <SurfaceCard style={styles.appealCard}>
              <View style={styles.cardHeading}>
                <AppText variant="subtitle">Request a manual review</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Explain why you believe this result should be reviewed.
                </AppText>
              </View>
              <TextField
                label="Appeal reason"
                placeholder="Tell the review team what went wrong…"
                value={appealReason}
                onChangeText={(value) => {
                  setAppealReason(value);
                  setError('');
                }}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={styles.appealInput}
              />
              <AppText variant="caption" color={colors.textMuted} style={styles.characterCount}>
                {appealReason.length}/1000
              </AppText>
              <Button label="Submit appeal" onPress={submitAppeal} loading={appealing} />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setShowAppeal(false);
                  setError('');
                }}
              />
            </SurfaceCard>
          ) : (
            <>
              <Button
                label="Try verification again"
                icon="refresh-outline"
                onPress={beginVerification}
                loading={launching}
              />
              <Button
                label="Appeal this result"
                icon="document-text-outline"
                variant="secondary"
                onPress={() => setShowAppeal(true)}
              />
            </>
          )}
        </AnimatedEntrance>
      ) : null}

      {status === 'APPEALING' ? (
        <AnimatedEntrance delay={80} style={styles.section}>
          <SurfaceCard style={styles.appealSummary}>
            <View style={[styles.smallIcon, { backgroundColor: colors.infoSoft }]}>
              <Ionicons name="chatbox-ellipses-outline" size={19} color={colors.info} />
            </View>
            <View style={styles.requirementCopy}>
              <AppText variant="bodyMedium">Your explanation</AppText>
              <AppText color={colors.textSecondary}>
                {result?.appealReason ?? 'Your appeal was submitted for manual review.'}
              </AppText>
            </View>
          </SurfaceCard>
          <Button
            label="Refresh appeal status"
            icon="refresh-outline"
            variant="secondary"
            onPress={refreshStatus}
          />
        </AnimatedEntrance>
      ) : null}

      {status === 'SUSPENDED' ? (
        <AnimatedEntrance delay={80} style={styles.section}>
          <NoticeCard tone="danger" icon="lock-closed-outline" title="Contact support">
            {result?.failureReason ??
              'The TaskGrid team needs to review this account before verification can continue.'}
          </NoticeCard>
          <Button
            label="Open help and support"
            icon="help-circle-outline"
            onPress={() => router.push('/(tabs)/profile/support')}
          />
        </AnimatedEntrance>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.sm },
  loadingState: {
    flex: 1,
    minHeight: 480,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  checkingOrb: {
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: spacing.lg, paddingTop: spacing.sm },
  heroIconRing: {
    width: 112,
    height: 112,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { alignItems: 'center', gap: spacing.sm, maxWidth: 340 },
  section: { gap: spacing.md },
  requirementsCard: { gap: spacing.lg },
  cardHeading: { gap: 3 },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  requirementIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementCopy: { flex: 1, gap: 2 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentCopy: { flex: 1 },
  policyLink: { textAlign: 'center', paddingVertical: spacing.xs },
  timelineCard: { gap: 0, paddingVertical: spacing.xl },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timelineIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCopy: { flex: 1, gap: 2 },
  timelineLine: { width: 2, height: 28, marginLeft: 20 },
  detailsCard: { gap: spacing.sm },
  detailRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { flex: 1 },
  detailValue: { textAlign: 'right', maxWidth: '45%' },
  appealCard: { gap: spacing.md },
  appealInput: { minHeight: 120, paddingTop: spacing.md },
  characterCount: { textAlign: 'right', marginTop: -spacing.sm },
  appealSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
});
