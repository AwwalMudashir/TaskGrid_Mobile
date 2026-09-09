import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { AuthArtwork } from '@/src/components/ui/AuthArtwork';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { ApiError, authApi } from '@/src/lib/api';
import { spacing, useAppTheme } from '@/src/theme';

type State = 'idle' | 'loading' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [token, setToken] = useState(typeof params.token === 'string' ? params.token : '');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const attempted = useRef(false);

  async function verify(value = token) {
    if (!value.trim()) {
      setState('error');
      setMessage('This link does not contain a verification token.');
      return;
    }
    setState('loading');
    setMessage('');
    try {
      await authApi.verifyEmail(value.trim());
      setState('success');
    } catch (cause) {
      setState('error');
      setMessage(
        cause instanceof ApiError
          ? cause.message
          : 'The link could not be verified. It may have expired.',
      );
    }
  }

  useEffect(() => {
    if (params.token && !attempted.current) {
      attempted.current = true;
      verify(params.token);
    }
  }, [params.token]);

  const success = state === 'success';
  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthArtwork name="email" width={170} height={170} />
      <View style={styles.copy}>
        <AppText variant="title">{success ? 'Email verified' : 'Verify your email'}</AppText>
        <AppText color={colors.textSecondary} style={styles.centerText}>
          {success
            ? 'Your account is active. You can now sign in safely.'
            : 'TaskGrid is checking your secure verification link.'}
        </AppText>
      </View>
      {state === 'error' ? (
        <NoticeCard tone="danger" icon="alert-circle-outline">
          {message}
        </NoticeCard>
      ) : null}
      {!params.token && !success ? (
        <TextField
          label="Verification token"
          placeholder="Paste the token from your email"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
      ) : null}
      <Button
        label={success ? 'Continue to sign in' : 'Verify email'}
        onPress={success ? () => router.replace('/(auth)/login') : () => verify()}
        loading={state === 'loading'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', gap: spacing.xl },
  copy: { alignItems: 'center', gap: spacing.sm },
  centerText: { textAlign: 'center' },
});
