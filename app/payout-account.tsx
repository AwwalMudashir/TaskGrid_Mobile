import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthContext';
import { BankPicker } from '@/src/features/wallet/BankPicker';
import {
  payoutAccountApi,
  type PayoutAccount,
  type PayoutBank,
} from '@/src/features/wallet/payout-account';
import { ApiError, kycApi } from '@/src/lib/api';
import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

function errorMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    return cause.message === 'An unexpected error occurred'
      ? "We couldn't load your payout details. Please try again."
      : cause.message;
  }
  return "We couldn't load your payout details. Please try again.";
}

export default function PayoutAccountScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<
    'unknown' | 'verified' | 'unverified' | 'error'
  >('unknown');
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState<PayoutBank[]>([]);
  const [current, setCurrent] = useState<PayoutAccount | null>(null);
  const [bank, setBank] = useState<PayoutBank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [preview, setPreview] = useState<PayoutAccount | null>(null);
  const [showBanks, setShowBanks] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setError('');
        if (user?.role !== 'RUNNER') {
          setLoading(false);
          return;
        }
        setVerificationStatus('unknown');
        try {
          const kyc = await kycApi.status();
          if (!active) return;
          if (kyc.status !== 'VERIFIED') {
            setVerificationStatus('unverified');
            return;
          }
          setVerificationStatus('verified');
          const [savedResult, banksResult] = await Promise.allSettled([
            payoutAccountApi.current(),
            payoutAccountApi.banks(),
          ]);
          if (!active) return;
          if (savedResult.status === 'fulfilled') setCurrent(savedResult.value);
          if (banksResult.status === 'fulfilled') setBanks(banksResult.value);
          if (savedResult.status === 'rejected' || banksResult.status === 'rejected') {
            setError(
              errorMessage(
                savedResult.status === 'rejected'
                  ? savedResult.reason
                  : banksResult.status === 'rejected'
                    ? banksResult.reason
                    : undefined,
              ),
            );
          }
        } catch (cause) {
          if (active) {
            setVerificationStatus('error');
            setError("We couldn't check your identity verification. Please try again.");
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
      return () => {
        active = false;
      };
    }, [user?.role, retryCount]),
  );

  async function verifyAccount() {
    if (!bank || !/^[0-9]{10}$/.test(accountNumber)) {
      setError('Choose a bank and enter a 10-digit account number.');
      return;
    }
    setWorking(true);
    setError('');
    setPreview(null);
    try {
      setPreview(await payoutAccountApi.resolve(bank.code, accountNumber));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function saveAccount() {
    if (!bank || !preview) return;
    setWorking(true);
    setError('');
    try {
      const saved = await payoutAccountApi.confirm(bank.code, accountNumber, preview.accountName);
      setCurrent(saved);
      setShowConfirm(false);
      setEditing(false);
      setPreview(null);
      setBank(null);
      setAccountNumber('');
      setSuccess('Your payout bank is ready for future withdrawals.');
    } catch (cause) {
      setShowConfirm(false);
      setPreview(null);
      setError(errorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader title="Payout bank" />
      <AnimatedEntrance style={styles.heroWrap}>
        <LinearGradient
          colors={['#242663', '#3153C9', '#126174']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadows.card]}
        >
          <View style={styles.heroCopy}>
            <AppText variant="eyebrow" color="#BEEAE5">
              WORKER PAYOUTS
            </AppText>
            <AppText variant="title" color="#FFFFFF" style={styles.heroTitle}>
              From task{'\n'}to bank.
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.83)" style={styles.heroCaption}>
              A verified destination for your future earnings.
            </AppText>
          </View>
          <FloatingPayoutArtwork />
        </LinearGradient>
      </AnimatedEntrance>
      {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
      {!loading && user?.role !== 'RUNNER' ? (
        <NoticeCard icon="wallet-outline">Payout banks are available to workers only.</NoticeCard>
      ) : null}
      {!loading && user?.role === 'RUNNER' ? (
        <>
          {error ? (
            <NoticeCard tone="danger" icon="alert-circle-outline">
              {error}
            </NoticeCard>
          ) : null}
          {success ? (
            <NoticeCard tone="success" icon="checkmark-circle-outline">
              {success}
            </NoticeCard>
          ) : null}
          {verificationStatus === 'unverified' ? (
            <AnimatedEntrance delay={80}>
              <SurfaceCard style={{ ...styles.requirement, borderColor: colors.warning }}>
                <AppText variant="eyebrow" color={colors.warning}>
                  BEFORE YOU START
                </AppText>
                <AppText variant="subtitle">Verify your identity first</AppText>
                <AppText color={colors.textSecondary}>
                  A completed worker identity check protects where your future earnings go.
                </AppText>
                <Button
                  label="Open verification"
                  onPress={() => router.push('/(tabs)/profile/kyc')}
                />
              </SurfaceCard>
            </AnimatedEntrance>
          ) : verificationStatus === 'error' ? (
            <Button
              label="Retry checking verification"
              variant="secondary"
              onPress={() => setRetryCount((count) => count + 1)}
            />
          ) : current && !editing ? (
            <AnimatedEntrance delay={90} style={styles.section}>
              <AppText variant="eyebrow" color={colors.primary}>
                YOUR SAVED DESTINATION
              </AppText>
              <LinearGradient
                colors={[colors.primarySoft, colors.surface]}
                style={[styles.savedCard, { borderColor: colors.border }]}
              >
                <View style={styles.savedTop}>
                  <AppText variant="eyebrow" color={colors.primary}>
                    PAYOUT ACCOUNT
                  </AppText>
                  <View style={[styles.savedSeal, { backgroundColor: colors.successSoft }]}>
                    <Ionicons name="checkmark" size={18} color={colors.success} />
                  </View>
                </View>
                <AppText variant="title" style={styles.savedBank}>
                  {current.bankName}
                </AppText>
                <View style={[styles.savedDivider, { backgroundColor: colors.divider }]} />
                <AppText variant="caption" color={colors.textMuted}>
                  ACCOUNT HOLDER
                </AppText>
                <AppText variant="bodyMedium">{current.accountName}</AppText>
                <AppText variant="title" color={colors.primary} style={styles.savedNumber}>
                  {current.maskedAccountNumber}
                </AppText>
              </LinearGradient>
              <Button
                label="Change payout bank"
                variant="secondary"
                onPress={() => {
                  setEditing(true);
                  setSuccess('');
                }}
              />
            </AnimatedEntrance>
          ) : (
            <>
              <AnimatedEntrance delay={90} style={styles.section}>
                <View style={styles.sectionHeading}>
                  <AppText variant="eyebrow" color={colors.primary}>
                    ACCOUNT DETAILS
                  </AppText>
                  <AppText variant="subtitle">
                    {current ? 'Choose a new destination' : 'Where should we pay you?'}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Select a bank, then enter the account number registered to you.
                  </AppText>
                </View>
                <SurfaceCard style={styles.formCard}>
                  {banks.length === 0 ? (
                    <Button
                      label="Retry loading banks"
                      variant="secondary"
                      loading={working}
                      onPress={async () => {
                        setWorking(true);
                        setError('');
                        try {
                          setBanks(await payoutAccountApi.banks());
                        } catch (cause) {
                          setError(errorMessage(cause));
                        } finally {
                          setWorking(false);
                        }
                      }}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select a bank"
                    onPress={() => setShowBanks(true)}
                    style={[
                      styles.bankSelector,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.bankSelectorCopy}>
                      <AppText variant="eyebrow" color={colors.textMuted}>
                        BANK
                      </AppText>
                      <AppText
                        variant="bodyMedium"
                        color={bank ? colors.text : colors.textSecondary}
                      >
                        {bank?.name ?? 'Tap to choose your bank'}
                      </AppText>
                    </View>
                    <View
                      style={[styles.bankSelectorArrow, { backgroundColor: colors.primarySoft }]}
                    >
                      <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                    </View>
                  </Pressable>
                  <TextField
                    label="Account number"
                    placeholder="10-digit account number"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={accountNumber}
                    onChangeText={(value) => {
                      setAccountNumber(value.replace(/[^0-9]/g, ''));
                      setPreview(null);
                      setError('');
                    }}
                  />
                  <AppText variant="caption" color={colors.textMuted}>
                    We show the bank's matched name before anything is saved.
                  </AppText>
                  <Button
                    label="Find account name"
                    loading={working && !showConfirm}
                    disabled={!bank || accountNumber.length !== 10}
                    onPress={verifyAccount}
                  />
                  {current ? (
                    <Button
                      label="Keep current bank"
                      variant="ghost"
                      onPress={() => setEditing(false)}
                    />
                  ) : null}
                </SurfaceCard>
              </AnimatedEntrance>
              {preview ? (
                <AnimatedEntrance delay={120} style={styles.section}>
                  <SurfaceCard style={styles.previewCard}>
                    <AppText variant="eyebrow" color={colors.success}>
                      NAME MATCHED
                    </AppText>
                    <AppText variant="title">{preview.accountName}</AppText>
                    <View style={[styles.previewRule, { backgroundColor: colors.divider }]} />
                    <AppText color={colors.textSecondary}>
                      {preview.bankName} · {preview.maskedAccountNumber}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      Only continue if this name is yours. You can go back and change the details.
                    </AppText>
                    <Button label="Continue to confirmation" onPress={() => setShowConfirm(true)} />
                  </SurfaceCard>
                </AnimatedEntrance>
              ) : null}
            </>
          )}
        </>
      ) : null}
      <BankPicker
        visible={showBanks}
        banks={banks}
        onClose={() => setShowBanks(false)}
        onChoose={(selected) => {
          setBank(selected);
          setPreview(null);
          setShowBanks(false);
          setError('');
        }}
      />
      <Modal
        transparent
        animationType="fade"
        visible={showConfirm}
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowConfirm(false)} />
          <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
            <AppText variant="eyebrow" color={colors.primary}>
              ONE LAST CHECK
            </AppText>
            <AppText variant="title">Does this account belong to you?</AppText>
            <View style={[styles.confirmAccount, { backgroundColor: colors.surfaceSecondary }]}>
              <AppText variant="eyebrow" color={colors.textMuted}>
                ACCOUNT HOLDER
              </AppText>
              <AppText variant="subtitle">{preview?.accountName}</AppText>
              <View style={[styles.previewRule, { backgroundColor: colors.divider }]} />
              <AppText color={colors.textSecondary}>
                {preview?.bankName} · {preview?.maskedAccountNumber}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.textSecondary}>
              Future withdrawals will go here. Please check the name carefully.
            </AppText>
            <Button label="Confirm & save" loading={working} onPress={saveAccount} />
            <Button label="Not my account" variant="ghost" onPress={() => setShowConfirm(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function FloatingPayoutArtwork() {
  const offset = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let loop: ReturnType<typeof Animated.loop> | undefined;
      void AccessibilityInfo.isReduceMotionEnabled()
        .then((reduced) => {
          if (!active || reduced) return;
          loop = Animated.loop(
            Animated.sequence([
              Animated.timing(offset, {
                toValue: -7,
                duration: 1850,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(offset, {
                toValue: 0,
                duration: 1850,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          );
          loop.start();
        })
        .catch(() => undefined);
      return () => {
        active = false;
        loop?.stop();
        offset.setValue(0);
      };
    }, [offset]),
  );

  return (
    <Animated.Image
      source={require('../assets/images/wallet/payout-bank.png')}
      resizeMode="contain"
      style={[styles.heroArt, { transform: [{ translateY: offset }] }]}
    />
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  loading: { marginTop: spacing.xxxl },
  heroWrap: { overflow: 'visible' },
  hero: {
    minHeight: 210,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  heroCopy: { width: '62%', gap: spacing.sm, zIndex: 1 },
  heroTitle: { lineHeight: 36 },
  heroCaption: { maxWidth: 190 },
  heroArt: { position: 'absolute', right: -17, bottom: -15, width: 184, height: 199 },
  requirement: { gap: spacing.md, borderWidth: 1 },
  section: { gap: spacing.md },
  sectionHeading: { gap: spacing.xs },
  formCard: { gap: spacing.md },
  bankSelector: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bankSelectorCopy: { flex: 1, gap: 5 },
  bankSelectorArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xs },
  savedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedSeal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBank: { marginTop: spacing.md, marginBottom: spacing.md },
  savedDivider: { height: 1, marginBottom: spacing.md },
  savedNumber: { marginTop: spacing.lg, letterSpacing: 2 },
  previewCard: { gap: spacing.md },
  previewRule: { height: 1, width: '100%' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12,20,38,0.62)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  confirmModal: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  confirmAccount: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
});
