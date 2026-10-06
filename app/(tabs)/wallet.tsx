import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AnimatedEntrance } from "@/src/components/ui/AnimatedEntrance";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { Screen } from "@/src/components/ui/Screen";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { MoneyField } from "@/src/components/ui/MoneyField";
import { useAuth } from "@/src/features/auth/AuthContext";
import {
  payoutAccountApi,
  type PayoutAccount,
} from "@/src/features/wallet/payout-account";
import {
  formatMoney,
  transactionStatus,
} from "@/src/features/wallet/transaction-display";
import { WalletTransactionRow } from "@/src/features/wallet/WalletTransactionRow";
import {
  walletApi,
  withdrawalIntent,
  type WalletSummary,
  type WalletTransaction,
  type Withdrawal,
  type WithdrawalIntent,
} from "@/src/features/wallet/wallet-api";
import { ApiError } from "@/src/lib/api";
import { radius, shadows, spacing, useAppTheme } from "@/src/theme";

function intentAlreadyResolved(
  intent: WithdrawalIntent,
  entries: WalletTransaction[],
) {
  const clockToleranceMs = 60_000;
  return entries.some(
    (entry) =>
      entry.type === "WITHDRAWAL" &&
      Math.abs(entry.amount - intent.amount) < 0.005 &&
      new Date(entry.createdAt).getTime() >=
        intent.createdAt - clockToleranceMs &&
      ["RELEASED", "FAILED", "CANCELLED"].includes(entry.status),
  );
}

export default function WalletScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(
    null,
  );
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pendingIntent, setPendingIntent] = useState<WithdrawalIntent | null>(
    null,
  );
  const [showPendingReminder, setShowPendingReminder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
  const [withdrawError, setWithdrawError] = useState("");

  const refresh = useCallback(async (): Promise<WalletTransaction[]> => {
    if (user?.role !== "RUNNER") return [];
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextTransactions, account] = await Promise.all([
        walletApi.summary(),
        walletApi.transactions(),
        payoutAccountApi.current(),
      ]);
      setSummary(nextSummary);
      setTransactions(nextTransactions);
      setPayoutAccount(account);
      return nextTransactions;
    } catch (cause) {
      setSummary(null);
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't load your wallet. Try again.",
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || user.role !== "RUNNER") return;
      let active = true;
      const userId = user.id;

      void Promise.all([refresh(), withdrawalIntent.load(userId)])
        .then(async ([nextTransactions, intent]) => {
          if (!active) return;
          if (intent && intentAlreadyResolved(intent, nextTransactions)) {
            await withdrawalIntent.clear(userId).catch(() => undefined);
            if (!active) return;
            setPendingIntent(null);
            setShowPendingReminder(false);
            return;
          }

          setPendingIntent(intent);
          if (!intent) {
            setShowPendingReminder(false);
            return;
          }

          setAmount(String(intent.amount));
          const shouldShow = await withdrawalIntent
            .markReminderShown(userId)
            .catch(() => false);
          if (active) setShowPendingReminder(shouldShow);
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [refresh, user?.id]),
  );

  const amountNumber = Number(amount);
  const amountValid =
    /^\d+(?:\.\d{1,2})?$/.test(amount.trim()) &&
    amountNumber > 0 &&
    (amountNumber <= (summary?.availableBalance ?? 0) ||
      pendingIntent?.amount === amountNumber);
  const recentTransactions = [...transactions]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, 3);

  async function submitWithdrawal() {
    if (!user?.id || !amountValid || !payoutAccount || submitting) return;
    setSubmitting(true);
    setWithdrawError("");
    try {
      const intent = await withdrawalIntent.create(user.id, amountNumber);
      setPendingIntent(intent);
      if (intent.amount !== amountNumber) {
        setWithdrawError(
          `Finish your ${formatMoney(intent.amount)} withdrawal first.`,
        );
        return;
      }
      const result = await walletApi.withdraw(intent.amount, intent.key);
      await withdrawalIntent.clear(user.id);
      setPendingIntent(null);
      setShowPendingReminder(false);
      setWithdrawal(result);
      setWithdrawOpen(false);
      setAmount("");
      await refresh();
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      if (
        apiError &&
        apiError.code >= 400 &&
        apiError.code < 500 &&
        apiError.code !== 408
      ) {
        await withdrawalIntent.clear(user.id).catch(() => undefined);
        setPendingIntent(null);
        setShowPendingReminder(false);
      } else {
        const shouldShow = await withdrawalIntent
          .markReminderShown(user.id)
          .catch(() => false);
        setShowPendingReminder(shouldShow);
      }
      setWithdrawError(
        apiError?.message ??
          "We couldn't check your withdrawal. Retry the same amount.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function checkWithdrawal() {
    if (!withdrawal) return;
    try {
      setWithdrawal(await walletApi.withdrawal(withdrawal.id));
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't refresh the status. Try again.",
      );
    }
  }

  function closeWithdrawal() {
    setWithdrawOpen(false);
    setShowPendingReminder(false);
  }
  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.header}>
        <AppText variant="eyebrow" color={colors.primary}>
          TASKGRID MONEY
        </AppText>
        <AppText variant="title">Wallet</AppText>
        <AppText color={colors.textSecondary}>
          {user?.role === "RUNNER"
            ? "Your earnings, from task to bank."
            : "Task payments in one place."}
        </AppText>
      </AnimatedEntrance>

      <AnimatedEntrance delay={70}>
        <LinearGradient
          colors={["#10233F", "#174B68", "#2563EB"]}
          style={[styles.balanceCard, shadows.card]}
        >
          <View style={styles.balanceTop}>
            <View>
              <AppText variant="caption" color="rgba(255,255,255,0.72)">
                Available to withdraw
              </AppText>
              <AppText variant="display" color="#FFFFFF">
                {user?.role === "RUNNER" && summary
                  ? formatMoney(summary.availableBalance, summary.currency)
                  : "—"}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.72)">
                {loading
                  ? "Refreshing your balance…"
                  : "Released earnings, less withdrawals"}
              </AppText>
            </View>
            <View style={styles.balanceOrbitOuter}>
              <View style={styles.balanceOrbitInner} />
            </View>
          </View>
          <Pressable
            disabled={
              user?.role !== "RUNNER" ||
              (Boolean(payoutAccount) &&
                (!summary || (summary.availableBalance <= 0 && !pendingIntent)))
            }
            onPress={() =>
              payoutAccount
                ? setWithdrawOpen(true)
                : router.push("/payout-account")
            }
            style={({ pressed }) => [
              styles.withdrawButton,
              { opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <AppText variant="button" color="#10233F">
              {user?.role === "RUNNER"
                ? payoutAccount
                  ? "Withdraw to bank"
                  : "Set up payout bank"
                : "Client payments coming later"}
            </AppText>
            <Ionicons
              name={
                user?.role === "RUNNER"
                  ? "arrow-forward"
                  : "lock-closed-outline"
              }
              size={18}
              color="#10233F"
            />
          </Pressable>
        </LinearGradient>
      </AnimatedEntrance>

      {error ? (
        <SurfaceCard
          style={StyleSheet.flatten([
            styles.notice,
            { backgroundColor: colors.dangerSoft },
          ])}
        >
          <AppText color={colors.danger}>{error}</AppText>
          <Button
            label="Try again"
            variant="ghost"
            onPress={() => void refresh()}
          />
        </SurfaceCard>
      ) : null}

      {user?.role === "RUNNER" ? (
        <AnimatedEntrance delay={120} style={styles.stats}>
          <WalletStat
            icon="time-outline"
            label="Pending earnings"
            value={summary ? formatMoney(summary.pendingBalance) : "—"}
          />
          <WalletStat
            icon="trending-up-outline"
            label="Total earned"
            value={summary ? formatMoney(summary.totalEarnings) : "—"}
          />
        </AnimatedEntrance>
      ) : null}

      {user?.role === "RUNNER" ? (
        <AnimatedEntrance delay={150} style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="subtitle">Payout bank</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh wallet"
              onPress={() => void refresh()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={colors.primary}
                />
              )}
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage payout bank"
            onPress={() => router.push("/payout-account")}
            style={({ pressed }) => [
              styles.payoutCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <AppText variant="eyebrow" color={colors.primary}>
              {payoutAccount ? "SAVED DESTINATION" : "YOUR NEXT STEP"}
            </AppText>
            <AppText variant="title" style={styles.payoutTitle}>
              {payoutAccount?.bankName ?? "Give your earnings a place to land."}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {payoutAccount
                ? `${payoutAccount.accountName} · ${payoutAccount.maskedAccountNumber}`
                : "Add a verified bank account before withdrawing earnings."}
            </AppText>
            <View
              style={[styles.payoutRule, { backgroundColor: colors.divider }]}
            />
            <View style={styles.payoutAction}>
              <AppText variant="bodyMedium" color={colors.primary}>
                {payoutAccount ? "View bank details" : "Set up payout bank"}
              </AppText>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </View>
          </Pressable>
        </AnimatedEntrance>
      ) : null}

      {user?.role === "RUNNER" && withdrawal ? (
        <AnimatedEntrance delay={160}>
          <SurfaceCard style={styles.resultCard}>
            <Ionicons
              name={
                withdrawal.status === "FAILED"
                  ? "alert-circle-outline"
                  : withdrawal.status === "RELEASED"
                    ? "checkmark-circle-outline"
                    : "hourglass-outline"
              }
              size={27}
              color={
                withdrawal.status === "FAILED"
                  ? colors.danger
                  : withdrawal.status === "RELEASED"
                    ? colors.success
                    : colors.warning
              }
            />
            <View style={styles.resultCopy}>
              <AppText variant="bodyMedium">
                {withdrawal.status === "FAILED"
                  ? "Withdrawal failed"
                  : withdrawal.status === "RELEASED"
                    ? "Withdrawal successful"
                    : "Withdrawal processing"}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {formatMoney(withdrawal.amount)} ·{" "}
                {transactionStatus(withdrawal.status)}
              </AppText>
              {withdrawal.status === "FAILED" && withdrawal.failureReason ? (
                <AppText variant="caption" color={colors.textMuted}>
                  {withdrawal.failureReason}
                </AppText>
              ) : null}
            </View>
            {withdrawal.status === "PROCESSING" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check withdrawal status"
                onPress={checkWithdrawal}
              >
                <Ionicons name="refresh" size={22} color={colors.primary} />
              </Pressable>
            ) : null}
          </SurfaceCard>
        </AnimatedEntrance>
      ) : null}

      <AnimatedEntrance delay={180} style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="subtitle">Recent transactions</AppText>
          {transactions.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all transactions"
              hitSlop={10}
              onPress={() => router.push("/transaction-history" as never)}
            >
              <AppText variant="bodyMedium" color={colors.primary}>
                All
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <SurfaceCard style={styles.transactionCard}>
          {user?.role !== "RUNNER" || transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <View
                style={[
                  styles.emptyMark,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <AppText variant="subtitle">A clean slate, for now.</AppText>
              <AppText
                variant="caption"
                color={colors.textMuted}
                style={styles.emptyCopy}
              >
                Your task earnings and withdrawals will appear here.
              </AppText>
            </View>
          ) : (
            recentTransactions.map((item, index) => (
              <WalletTransactionRow
                key={item.id}
                item={item}
                showDivider={index > 0}
              />
            ))
          )}
        </SurfaceCard>
      </AnimatedEntrance>
      <Modal
        visible={withdrawOpen}
        transparent
        animationType="fade"
        onRequestClose={closeWithdrawal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeWithdrawal}
              accessibilityLabel="Close withdrawal"
            />
            <View
              style={[styles.modalCard, { backgroundColor: colors.surface }]}
            >
              <AppText variant="subtitle">Withdraw earnings</AppText>
              <AppText color={colors.textSecondary}>
                {payoutAccount?.bankName} · {payoutAccount?.maskedAccountNumber}
              </AppText>
              <MoneyField
                label="Amount"
                value={amount}
                keyboardAware={false}
                editable={!pendingIntent && !submitting}
                onChangeText={(value) => {
                  setAmount(value);
                  setWithdrawError("");
                }}
              />
              <AppText variant="caption" color={colors.textMuted}>
                Available: {formatMoney(summary?.availableBalance ?? 0)}
              </AppText>
              {pendingIntent && showPendingReminder ? (
                <AppText variant="caption" color={colors.warning}>
                  We could not confirm your last request. Try once more with the
                  same amount. It cannot be sent twice.
                </AppText>
              ) : null}
              {withdrawError ? (
                <AppText variant="caption" color={colors.danger}>
                  {withdrawError}
                </AppText>
              ) : null}
              <Button
                label={`Confirm withdrawal${amountValid ? ` · ${formatMoney(amountNumber)}` : ""}`}
                onPress={submitWithdrawal}
                loading={submitting}
                disabled={!amountValid}
              />
              <Button
                label="Not now"
                variant="ghost"
                onPress={closeWithdrawal}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function WalletStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="subtitle">{value}</AppText>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: { gap: spacing.xs },
  balanceCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
    overflow: "hidden",
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  balanceOrbitOuter: {
    position: "absolute",
    right: -57,
    top: -68,
    width: 167,
    height: 167,
    borderRadius: 84,
    borderWidth: 23,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceOrbitInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  withdrawButton: {
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  stats: { flexDirection: "row", gap: spacing.md },
  statCard: { flex: 1, gap: spacing.sm },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: spacing.md },
  payoutCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  payoutTitle: { maxWidth: 285 },
  payoutRule: { height: 1, marginTop: spacing.sm },
  payoutAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transactionCard: { paddingVertical: 0 },
  emptyTransactions: {
    minHeight: 178,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emptyMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCopy: { textAlign: "center", maxWidth: 245 },
  resultCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  resultCopy: { flex: 1, gap: 3 },
  notice: { gap: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7,13,30,0.65)",
    justifyContent: "flex-end",
  },
  modalKeyboard: { flex: 1 },
  modalCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
});
