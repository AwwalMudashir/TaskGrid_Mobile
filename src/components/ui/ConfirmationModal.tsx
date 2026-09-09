import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm(): void;
  onCancel(): void;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep editing',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close confirmation"
          onPress={onCancel}
          style={styles.overlay}
        />
        <View
          accessibilityRole="alert"
          style={[styles.dialog, { backgroundColor: colors.surface }, shadows.card]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="alert-outline" size={25} color={colors.danger} />
          </View>
          <View style={styles.copy}>
            <AppText variant="subtitle" style={styles.centerText}>
              {title}
            </AppText>
            <AppText color={colors.textSecondary} style={styles.centerText}>
              {message}
            </AppText>
          </View>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            </View>
            <View style={styles.action}>
              <Button label={confirmLabel} variant="danger" onPress={onConfirm} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(7, 17, 31, 0.62)',
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: spacing.sm },
  centerText: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md, width: '100%', paddingTop: spacing.xs },
  action: { flex: 1 },
});
