import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthContext';
import { ApiError } from '@/src/lib/api';
import { passwordError } from '@/src/lib/validation';
import { radius, spacing, useAppTheme } from '@/src/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { changePassword } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit() {
    const issue = !current
      ? 'Enter your current password.'
      : passwordError(next) ||
        (next !== confirm
          ? 'The new passwords do not match.'
          : current === next
            ? 'Choose a password different from your current one.'
            : '');

    if (issue) return setError(issue);

    setLoading(true);
    setError('');
    try {
      await changePassword(current, next, confirm);
      setComplete(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not update your password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader title="Change password" subtitle="Keep your account protected" />
      <View style={styles.body}>
        <View
          style={[
            styles.icon,
            { backgroundColor: complete ? colors.successSoft : colors.primarySoft },
          ]}
        >
          <Ionicons
            name={complete ? 'checkmark-circle-outline' : 'key-outline'}
            size={34}
            color={complete ? colors.success : colors.primary}
          />
        </View>

        <View style={styles.copy}>
          <AppText variant="title">
            {complete ? 'Password changed' : 'Choose a new password'}
          </AppText>
          <AppText color={colors.textSecondary}>
            {complete
              ? 'Your new password is active. Your signed-in session remains secure.'
              : 'Confirm your current password, then choose a strong replacement.'}
          </AppText>
        </View>

        {error ? (
          <NoticeCard tone="danger" icon="alert-circle-outline">
            {error}
          </NoticeCard>
        ) : null}

        {!complete ? (
          <>
            <TextField
              label="Current password"
              icon="lock-open-outline"
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
              autoComplete="current-password"
            />
            <TextField
              label="New password"
              icon="lock-closed-outline"
              value={next}
              onChangeText={setNext}
              secureTextEntry
              autoComplete="new-password"
            />
            <TextField
              label="Confirm new password"
              icon="shield-checkmark-outline"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
            />
            <AppText variant="caption" color={colors.textMuted} style={styles.fieldHint}>
              Use at least 8 characters with uppercase, lowercase and a number.
            </AppText>
          </>
        ) : null}

        <Button
          label={complete ? 'Back to profile' : 'Update password'}
          icon={complete ? 'arrow-back' : 'checkmark'}
          onPress={complete ? () => router.back() : submit}
          loading={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm },
  body: { flex: 1, gap: spacing.xl, paddingTop: spacing.lg },
  icon: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: spacing.sm },
  fieldHint: { marginTop: -spacing.md, paddingHorizontal: spacing.xs },
});
