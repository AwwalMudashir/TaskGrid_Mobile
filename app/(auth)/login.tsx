import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthArtwork } from '@/src/components/ui/AuthArtwork';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthContext';
import { ApiError } from '@/src/lib/api';
import { isEmail } from '@/src/lib/validation';
import { spacing, useAppTheme } from '@/src/theme';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!isEmail(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not sign in. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.hero}>
        <AuthArtwork name="login" width={158} height={164} />
        <View style={styles.heroCopy}>
          <AppText variant="title" style={styles.centerText}>
            Welcome back
          </AppText>
          <AppText color={colors.textSecondary} style={styles.centerText}>
            Sign in to continue to your TaskGrid account.
          </AppText>
        </View>
      </AnimatedEntrance>

      <AnimatedEntrance delay={100} style={styles.form}>
        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        <TextField
          label="Email address"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextField
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={submit}
        />
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgot}>
            <AppText variant="bodyMedium" color={colors.primary}>
              Forgot password?
            </AppText>
          </Pressable>
        </Link>
        <Button label="Sign in" onPress={submit} loading={loading} />
      </AnimatedEntrance>

      <AnimatedEntrance delay={180} style={styles.footer}>
        <AppText variant="caption" color={colors.textSecondary}>
          Don&apos;t have an account?
        </AppText>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <AppText variant="caption" color={colors.primary}>
              Sign up
            </AppText>
          </Pressable>
        </Link>
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroCopy: { alignItems: 'center', gap: spacing.sm },
  centerText: { textAlign: 'center' },
  form: { gap: spacing.lg, marginTop: spacing.xxl },
  forgot: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 'auto',
    paddingTop: spacing.xxxl,
  },
});
