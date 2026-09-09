import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthArtwork } from '@/src/components/ui/AuthArtwork';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { TextField } from '@/src/components/ui/TextField';
import type { SupportOptions } from '@/src/features/auth/types';
import { ApiError, supportApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

export default function SupportScreen() {
  const { colors } = useAppTheme();
  const [options, setOptions] = useState<SupportOptions | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    supportApi
      .options()
      .then(setOptions)
      .catch(() => undefined);
  }, []);

  async function send() {
    if (subject.trim().length < 3) return setError('Tell us briefly what you need help with.');
    if (message.trim().length < 10)
      return setError('Add a little more detail so we can help you properly.');
    setLoading(true);
    setError('');
    try {
      await supportApi.contact(subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      Alert.alert('Message sent', 'TaskGrid support has received your message.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Your message could not be sent.');
    } finally {
      setLoading(false);
    }
  }

  async function callSupport() {
    if (!options?.phoneNumber)
      return Alert.alert(
        'Calling is not configured yet',
        'Add SUPPORT_PHONE to the backend environment to enable this option.',
      );
    await Linking.openURL(`tel:${options.phoneNumber.replace(/\s/g, '')}`);
  }

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader title="Help and support" subtitle="We’re here when something goes wrong" />
      <AnimatedEntrance style={styles.hero}>
        <View style={[styles.artStage, { backgroundColor: colors.primarySoft }]}>
          <AuthArtwork name="registration" width={154} height={142} />
        </View>
        <View style={styles.heroCopy}>
          <AppText variant="title">How can we help?</AppText>
          <AppText color={colors.textSecondary} style={styles.center}>
            Send the team a message or call the configured support line.
          </AppText>
        </View>
      </AnimatedEntrance>
      <AnimatedEntrance delay={80}>
        <SurfaceCard style={styles.contactCard}>
          <View style={[styles.contactIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="call-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.contactCopy}>
            <AppText variant="bodyMedium">Call TaskGrid support</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {options?.phoneNumber ?? 'Support line awaiting configuration'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={callSupport}
            style={[
              styles.callButton,
              { backgroundColor: options?.phoneNumber ? colors.primary : colors.surfaceSecondary },
            ]}
          >
            <AppText
              variant="button"
              color={options?.phoneNumber ? colors.textOnPrimary : colors.textMuted}
            >
              Call
            </AppText>
          </Pressable>
        </SurfaceCard>
      </AnimatedEntrance>
      <AnimatedEntrance delay={130} style={styles.form}>
        <View>
          <AppText variant="subtitle">Contact us</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Replies will be sent to your account email.
          </AppText>
        </View>
        {error ? (
          <NoticeCard tone="danger" icon="alert-circle-outline">
            {error}
          </NoticeCard>
        ) : null}
        <TextField
          label="Subject"
          placeholder="What do you need help with?"
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
        />
        <TextField
          label="Message"
          placeholder="Describe the problem or question"
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          maxLength={3000}
          style={styles.messageInput}
        />
        <Button label="Send message" icon="send-outline" onPress={send} loading={loading} />
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.sm },
  hero: { alignItems: 'center', gap: spacing.md },
  artStage: {
    width: '100%',
    height: 172,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroCopy: { alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: { flex: 1, gap: 2 },
  callButton: {
    minWidth: 66,
    minHeight: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { gap: spacing.lg },
  messageInput: { minHeight: 120, paddingTop: spacing.md },
});
