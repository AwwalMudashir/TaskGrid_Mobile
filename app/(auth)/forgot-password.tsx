import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthArtwork } from '@/src/components/ui/AuthArtwork';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { ApiError, authApi } from '@/src/lib/api';
import { isEmail } from '@/src/lib/validation';
import { spacing, useAppTheme } from '@/src/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!isEmail(email)) return setError('Enter a valid email address.');
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not request a reset link. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader title="" />
      <AnimatedEntrance style={styles.body}>
        <AuthArtwork name={sent ? 'email' : 'recovery'} width={170} height={170} />
        <View style={styles.copy}>
          <AppText variant="title" style={styles.centerText}>
            {sent ? 'Check your inbox' : 'Forgot password?'}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.centerText}>
            {sent
              ? `If an account exists for ${email.trim()}, we sent it a secure reset link.`
              : 'Enter the email on your TaskGrid account and we’ll send a one-time reset link.'}
          </AppText>
        </View>
        {error ? (
          <NoticeCard tone="danger" icon="alert-circle-outline">
            {error}
          </NoticeCard>
        ) : null}
        {!sent ? (
          <>
            <TextField
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={submit}
            />
            <Button label="Send reset link" onPress={submit} loading={loading} />
          </>
        ) : (
          <>
            <NoticeCard tone="info">
              For security, the message is the same even when an email is not registered.
            </NoticeCard>
            <Button label="Send again" variant="secondary" onPress={() => setSent(false)} />
          </>
        )}
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.link}>
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <AppText variant="bodyMedium" color={colors.primary}>
              Back to sign in
            </AppText>
          </Pressable>
        </Link>
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm },
  body: { flex: 1, gap: spacing.xl, paddingTop: spacing.sm },
  copy: { gap: spacing.sm, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
