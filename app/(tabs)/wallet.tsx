import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

const transactions: { title: string; detail: string; amount: string; icon: 'receipt-outline' }[] =
  [];

export default function WalletScreen() {
  const { colors } = useAppTheme();
  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.header}>
        <View>
          <AppText variant="title">Wallet</AppText>
          <AppText color={colors.textSecondary}>Your earnings and secure payments</AppText>
        </View>
        <Pressable
          style={[
            styles.iconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="ellipsis-horizontal" size={21} color={colors.primary} />
        </Pressable>
      </AnimatedEntrance>

      <AnimatedEntrance delay={70}>
        <LinearGradient
          colors={['#10233F', '#174B68', '#2563EB']}
          style={[styles.balanceCard, shadows.card]}
        >
          <View style={styles.balanceTop}>
            <View>
              <AppText variant="caption" color="rgba(255,255,255,0.72)">
                Available balance
              </AppText>
              <AppText variant="display" color="#FFFFFF">
                ₦0.00
              </AppText>
            </View>
            <View style={styles.walletGlyph}>
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.withdrawButton, { opacity: pressed ? 0.82 : 1 }]}
          >
            <AppText variant="button" color="#10233F">
              Wallet setup coming next
            </AppText>
            <Ionicons name="lock-closed-outline" size={18} color="#10233F" />
          </Pressable>
        </LinearGradient>
      </AnimatedEntrance>

      <AnimatedEntrance delay={120} style={styles.stats}>
        <WalletStat icon="time-outline" label="Pending (escrow)" value="₦0.00" />
        <WalletStat icon="trending-up-outline" label="Total earnings" value="₦0.00" />
      </AnimatedEntrance>

      <AnimatedEntrance delay={180} style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="subtitle">Recent transactions</AppText>
        </View>
        <SurfaceCard style={styles.transactionCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <View style={[styles.transactionIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.transactionCopy}>
                <AppText variant="bodyMedium">No transactions yet</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Task payments and escrow activity will appear here.
                </AppText>
              </View>
            </View>
          ) : (
            transactions.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.transaction,
                  index > 0 && { borderTopColor: colors.divider, borderTopWidth: 1 },
                ]}
              >
                <View style={[styles.transactionIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={item.icon} size={19} color={colors.primary} />
                </View>
                <View style={styles.transactionCopy}>
                  <AppText variant="bodyMedium">{item.title}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {item.detail}
                  </AppText>
                </View>
                <AppText
                  variant="bodyMedium"
                  color={item.amount.startsWith('+') ? colors.success : colors.text}
                >
                  {item.amount}
                </AppText>
              </View>
            ))
          )}
        </SurfaceCard>
      </AnimatedEntrance>
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
  screen: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletGlyph: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButton: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stats: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, gap: spacing.sm },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transactionCard: { paddingVertical: 0 },
  transaction: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionCopy: { flex: 1, gap: 2 },
  emptyTransactions: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
