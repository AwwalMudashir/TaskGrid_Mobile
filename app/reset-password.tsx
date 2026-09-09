import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { AuthArtwork } from '@/src/components/ui/AuthArtwork';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { ApiError, authApi } from '@/src/lib/api';
import { passwordError } from '@/src/lib/validation';
import { spacing, useAppTheme } from '@/src/theme';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [token, setToken] = useState(typeof params.token === 'string' ? params.token : '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit() {
    const issue = !token.trim()
      ? 'This reset link has no token.'
      : passwordError(password) || (password !== confirm ? 'The passwords do not match.' : '');
    if (issue) return setError(issue);
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token.trim(), password, confirm);
      setComplete(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not reset your password. The link may have expired.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader title="" />
      <View style={styles.body}>
        <AuthArtwork name={complete ? 'email' : 'recovery'} width={164} height={164} />
        <View style={styles.copy}>
          <AppText variant="title" style={styles.centerText}>
            {complete ? 'Password updated' : 'Create a new password'}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.centerText}>
            {complete
              ? 'Your new password is ready. Sign in to continue.'
              : 'Choose something strong that you do not use on another account.'}
          </AppText>
        </View>
        {error ? (
          <NoticeCard tone="danger" icon="alert-circle-outline">
            {error}
          </NoticeCard>
        ) : null}
        {!complete ? (
          <>
            {!params.token ? (
              <TextField
                label="Reset token"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />
            ) : null}
            <TextField
              label="New password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <TextField
              label="Confirm new password"
              placeholder="Enter it again"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
            />
            <NoticeCard icon="key-outline">
              Use uppercase, lowercase and a number, with at least 8 characters.
            </NoticeCard>
          </>
        ) : null}
        <Button
          label={complete ? 'Sign in' : 'Update password'}
          onPress={complete ? () => router.replace('/(auth)/login') : submit}
          loading={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm },
  body: { flex: 1, gap: spacing.xl, paddingTop: spacing.sm },
  copy: { gap: spacing.sm, alignItems: 'center' },
  centerText: { textAlign: 'center' },
});
