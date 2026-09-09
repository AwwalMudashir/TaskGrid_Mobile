import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { radius, spacing, useAppTheme } from '@/src/theme';

export default function MessagesScreen() {
  const { colors } = useAppTheme();

  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.header}>
        <AppText variant="title">Messages</AppText>
        <AppText color={colors.textSecondary}>Your task conversations, kept together.</AppText>
      </AnimatedEntrance>

      <AnimatedEntrance delay={100} style={styles.empty}>
        <View style={[styles.icon, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="chatbubbles-outline" size={38} color={colors.accent} />
        </View>
        <AppText variant="subtitle">No conversations yet</AppText>
        <AppText color={colors.textSecondary}>
          When you connect over a task, your secure conversation will appear here.
        </AppText>
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xl },
  header: { gap: spacing.xs },
  empty: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  icon: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
