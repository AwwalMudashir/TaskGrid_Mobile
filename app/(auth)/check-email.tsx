import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthArtwork } from '@/src/components/ui/AuthArtwork';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { ApiError, authApi } from '@/src/lib/api';
import { spacing, useAppTheme } from '@/src/theme';

export default function CheckEmailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function resend() {
    if (!email) return setError('Return to registration and enter your email address again.');
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authApi.resendVerification(email);
      setMessage('A fresh verification link has been sent.');
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not resend the email. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.body}>
        <AuthArtwork name="email" width={164} height={164} />
        <View style={styles.copy}>
          <AppText variant="title">Verify your email</AppText>
          <AppText color={colors.textSecondary} style={styles.centerText}>
            We sent a verification link to{email ? `\n${email}` : ' your email address'}. Tap it to
            activate your TaskGrid account.
          </AppText>
        </View>
        {message ? <NoticeCard tone="success">{message}</NoticeCard> : null}
        {error ? (
          <NoticeCard tone="danger" icon="alert-circle-outline">
            {error}
          </NoticeCard>
        ) : null}
        <View style={styles.actions}>
          <Button label="Open email app" onPress={() => Linking.openURL('mailto:')} />
          <Button
            label="Resend verification"
            variant="secondary"
            onPress={resend}
            loading={loading}
          />
          <Button
            label="I’ve verified — sign in"
            variant="ghost"
            onPress={() => router.replace('/(auth)/login')}
          />
        </View>
        <NoticeCard icon="information-circle-outline">
          The verification link is time-limited. Check your spam folder if it does not arrive.
        </NoticeCard>
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  body: { gap: spacing.xl, alignItems: 'stretch' },
  copy: { alignItems: 'center', gap: spacing.sm },
  centerText: { textAlign: 'center' },
  actions: { gap: spacing.md },
});
