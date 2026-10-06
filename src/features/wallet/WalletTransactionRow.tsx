import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import {
  formatMoney,
  transactionStatus,
  transactionTitle,
} from '@/src/features/wallet/transaction-display';
import type { WalletTransaction } from '@/src/features/wallet/wallet-api';
import { radius, spacing, useAppTheme } from '@/src/theme';

type WalletTransactionRowProps = {
  item: WalletTransaction;
  showDivider?: boolean;
};

export function WalletTransactionRow({ item, showDivider = false }: WalletTransactionRowProps) {
  const { colors } = useAppTheme();
  const failed = item.status === 'FAILED';
  const isReleasedEarning = item.type === 'ESCROW' && item.status === 'RELEASED';

  return (
    <View
      style={[
        styles.row,
        showDivider && { borderTopColor: colors.divider, borderTopWidth: 1 },
        item.failureReason && styles.detailedRow,
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: failed ? colors.dangerSoft : colors.primarySoft,
            borderColor: failed ? colors.danger : 'transparent',
            borderWidth: failed ? 1 : 0,
          },
        ]}
      >
        <Ionicons
          name={item.type === 'WITHDRAWAL' ? 'arrow-up-outline' : 'arrow-down-outline'}
          size={19}
          color={failed ? colors.danger : colors.primary}
        />
      </View>

      <View style={styles.copy}>
        <AppText variant="bodyMedium">{transactionTitle(item)}</AppText>
        <AppText variant="caption" color={failed ? colors.danger : colors.textMuted}>
          {transactionStatus(item.status)} · {new Date(item.createdAt).toLocaleDateString('en-NG')}
        </AppText>
        {failed && item.failureReason ? (
          <AppText variant="caption" color={colors.textMuted}>
            {item.failureReason}
          </AppText>
        ) : null}
      </View>

      <AppText
        variant="bodyMedium"
        color={failed ? colors.danger : isReleasedEarning ? colors.success : colors.text}
      >
        {item.type === 'WITHDRAWAL' && !failed ? '−' : isReleasedEarning ? '+' : ''}
        {formatMoney(item.amount, item.currency)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  detailedRow: { minHeight: 96, paddingVertical: spacing.lg },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
});
