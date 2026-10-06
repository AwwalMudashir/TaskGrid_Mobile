import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TransactionListSkeleton } from '@/src/components/ui/SkeletonLoader';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { WalletTransactionRow } from '@/src/features/wallet/WalletTransactionRow';
import { walletApi, type WalletTransaction } from '@/src/features/wallet/wallet-api';
import { ApiError } from '@/src/lib/api';
import { spacing, useAppTheme } from '@/src/theme';

type TransactionGroup = {
  label: string;
  transactions: WalletTransaction[];
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function groupLabel(createdAt: string, now = new Date()) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'A long time ago';

  const transactionDay = startOfDay(date);
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (transactionDay.getTime() === today.getTime()) return 'Today';
  if (transactionDay.getTime() === yesterday.getTime()) return 'Yesterday';

  const thisWeek = startOfWeek(now);
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (transactionDay >= thisWeek) return 'This week';
  if (transactionDay >= lastWeek) return 'Last week';

  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return 'Earlier this month';
  }
  if (date.getFullYear() === now.getFullYear()) return 'Earlier this year';
  return 'A long time ago';
}

function groupTransactions(transactions: WalletTransaction[]): TransactionGroup[] {
  const sorted = [...transactions].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const groups = new Map<string, WalletTransaction[]>();

  for (const transaction of sorted) {
    const label = groupLabel(transaction.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), transaction]);
  }

  return Array.from(groups, ([label, groupedTransactions]) => ({
    label,
    transactions: groupedTransactions,
  }));
}

export default function TransactionHistoryScreen() {
  const { colors } = useAppTheme();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const groups = useMemo(() => groupTransactions(transactions), [transactions]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTransactions(await walletApi.transactions());
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't load your transactions. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTransactions();
    }, [loadTransactions]),
  );

  return (
    <Screen contentStyle={styles.screen}>
      <AuthHeader title="Transactions" subtitle="Your earnings and withdrawals, newest first." />

      {loading ? <TransactionListSkeleton count={5} /> : null}

      {!loading && error ? (
        <SurfaceCard style={styles.messageCard}>
          <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
          <AppText variant="subtitle">Transactions are unavailable</AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.centeredText}>
            {error}
          </AppText>
          <Button label="Try again" variant="ghost" onPress={() => void loadTransactions()} />
        </SurfaceCard>
      ) : null}

      {!loading && !error && groups.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyMark, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="receipt-outline" size={30} color={colors.primary} />
          </View>
          <AppText variant="subtitle">No transactions yet</AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.centeredText}>
            Your earnings and withdrawals will be organised here when they begin.
          </AppText>
        </View>
      ) : null}

      {!loading && !error
        ? groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <AppText variant="eyebrow" color={colors.textMuted}>
                {group.label.toUpperCase()}
              </AppText>
              <SurfaceCard style={styles.transactionCard}>
                {group.transactions.map((transaction, index) => (
                  <WalletTransactionRow
                    key={transaction.id}
                    item={transaction}
                    showDivider={index > 0}
                  />
                ))}
              </SurfaceCard>
            </View>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  group: { gap: spacing.sm },
  transactionCard: { paddingVertical: 0 },
  messageCard: { alignItems: 'center', gap: spacing.sm },
  emptyState: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyMark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  centeredText: { textAlign: 'center', maxWidth: 275 },
});
