import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import {
  formatMoney,
  transactionStatus,
  transactionTitle,
} from '@/src/features/wallet/transaction-display';
import type { WalletTransaction } from '@/src/features/wallet/wallet-api';
import { radius, spacing, useAppTheme } from '@/src/theme';

type Props = {
  item: WalletTransaction | null;
  onClose: () => void;
};

export function WalletTransactionDetailModal({ item, onClose }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();
  if (!item) return null;

  const failed = item.status === 'FAILED';
  const successful = ['RELEASED', 'PARTIALLY_RELEASED'].includes(item.status);
  const statusColor = failed ? colors.danger : successful ? colors.success : colors.primary;
  const destination = item.destinationBankName
    ? `${item.destinationBankName}${item.destinationMaskedAccountNumber ? ` · ${item.destinationMaskedAccountNumber}` : ''}`
    : item.destinationName;
  const statusChanged =
    item.statusUpdatedAt &&
    Math.abs(new Date(item.statusUpdatedAt).getTime() - new Date(item.createdAt).getTime()) > 1000;

  function openTask() {
    if (!item?.taskId) return;
    const taskId = item.taskId;
    onClose();
    router.push({ pathname: '/task/[id]', params: { id: taskId } } as never);
  }

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close transaction details"
          onPress={onClose}
        />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <AppText variant="eyebrow" color={colors.textMuted}>
                  Transaction details
                </AppText>
                <AppText variant="subtitle">{transactionTitle(item)}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close transaction details"
                hitSlop={8}
                onPress={onClose}
                style={[styles.close, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={21} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.amountHero}>
              <View style={[styles.directionMark, { backgroundColor: `${statusColor}16` }]}>
                <Ionicons
                  name={item.type === 'WITHDRAWAL' ? 'arrow-up' : 'arrow-down'}
                  size={23}
                  color={statusColor}
                />
              </View>
              <AppText variant="display" style={styles.amount}>
                {formatMoney(item.amount, item.currency)}
              </AppText>
              <View style={[styles.statusPill, { backgroundColor: `${statusColor}14` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <AppText variant="caption" color={statusColor}>
                  {transactionStatus(item.status)}
                </AppText>
              </View>
            </View>

            <View style={styles.details}>
              <DetailRow label="From" value={item.sourceName} />
              <DetailRow label="To" value={destination} />
              {item.destinationBankName && item.destinationName ? (
                <DetailRow label="Account name" value={item.destinationName} />
              ) : null}
              {item.taskTitle ? <DetailRow label="Related task" value={item.taskTitle} /> : null}
              <DetailRow label="Created" value={dateTime(item.createdAt)} />
              {statusChanged && item.statusUpdatedAt ? (
                <DetailRow label="Last updated" value={dateTime(item.statusUpdatedAt)} />
              ) : null}
              <DetailRow label="Reference" value={item.id} selectable />
            </View>

            {item.failureReason ? (
              <View style={[styles.failure, { backgroundColor: colors.dangerSoft }]}>
                <AppText variant="eyebrow" color={colors.danger}>
                  Why it failed
                </AppText>
                <AppText color={colors.textSecondary}>{item.failureReason}</AppText>
              </View>
            ) : null}

            {item.taskId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open related task"
                onPress={openTask}
                style={({ pressed }) => [styles.taskAction, { opacity: pressed ? 0.6 : 1 }]}
              >
                <AppText variant="bodyMedium" color={colors.primary}>
                  View related task
                </AppText>
                <Ionicons name="arrow-forward" size={19} color={colors.primary} />
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  selectable = false,
}: {
  label: string;
  value: string;
  selectable?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
      <AppText variant="caption" color={colors.textMuted} style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText
        variant="bodyMedium"
        selectable={selectable}
        style={styles.detailValue}
        numberOfLines={selectable ? undefined : 3}
      >
        {value}
      </AppText>
    </View>
  );
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4, 11, 24, 0.58)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center' },
  content: { padding: spacing.xl, gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountHero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  directionMark: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { fontSize: 31, lineHeight: 38 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  details: { gap: 0 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  detailLabel: { width: 88, paddingTop: 2 },
  detailValue: { flex: 1, textAlign: 'right' },
  failure: { gap: spacing.xs, borderRadius: radius.md, padding: spacing.lg },
  taskAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
