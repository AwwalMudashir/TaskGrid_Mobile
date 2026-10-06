import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { SettingsRow } from '@/src/components/ui/SettingsRow';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { useAuth } from '@/src/features/auth/AuthContext';
import {
  arePushNotificationsEnabled,
  setPushNotificationsEnabled,
} from '@/src/features/notifications/push-notifications';
import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, setThemePreference } = useAppTheme();
  const { user, signOut, reloadProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const role =
    user?.role === 'RUNNER' ? 'Worker' : user?.role === 'CLIENT' ? 'Client' : 'Administrator';
  const initial = user?.fullName.charAt(0).toUpperCase() || '?';

  function confirmSignOut() {
    Alert.alert(
      'Sign out of TaskGrid?',
      'You will need your email and password to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await signOut();
            setSigningOut(false);
          },
        },
      ],
    );
  }

  useEffect(() => {
    void arePushNotificationsEnabled()
      .then(setNotificationsEnabled)
      .catch(() => undefined);
  }, []);

  async function updateNotifications(enabled: boolean) {
    if (savingNotifications) return;
    setSavingNotifications(true);
    setNotificationsEnabled(enabled);
    try {
      const result = await setPushNotificationsEnabled(enabled);
      setNotificationsEnabled(result.enabled);
      if (!result.enabled && result.reason === 'permission-denied') {
        Alert.alert(
          'Notifications are blocked',
          'Allow notifications in your phone settings, then turn this option on again.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
      } else if (!result.enabled && enabled) {
        Alert.alert(
          'Notifications could not be enabled',
          'Check your connection and try again. Your other app features will continue to work.',
        );
      }
    } catch {
      setNotificationsEnabled(!enabled);
      Alert.alert('Could not save this setting', 'Check your connection and try again.');
    } finally {
      setSavingNotifications(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.topbar}>
        <View>
          <AppText variant="title">Profile</AppText>
          <AppText color={colors.textSecondary}>Account, security and preferences</AppText>
        </View>
        <Pressable
          accessibilityLabel="Refresh profile"
          onPress={() => reloadProfile().catch(() => undefined)}
          style={[styles.refresh, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </AnimatedEntrance>

      <AnimatedEntrance delay={70}>
        <SurfaceCard style={styles.identityCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {user?.profilePictureUrl ? (
              <Image source={{ uri: user.profilePictureUrl }} style={styles.avatarImage} />
            ) : (
              <AppText variant="title" color="#FFFFFF">
                {initial}
              </AppText>
            )}
          </View>
          <View style={styles.identity}>
            <AppText variant="subtitle">{user?.fullName}</AppText>
            <AppText color={colors.textSecondary}>{user?.email}</AppText>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                <AppText variant="caption" color={colors.primary}>
                  {role}
                </AppText>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: user?.emailVerified ? colors.successSoft : colors.warningSoft,
                  },
                ]}
              >
                <Ionicons
                  name={user?.emailVerified ? 'checkmark-circle' : 'alert-circle'}
                  size={14}
                  color={user?.emailVerified ? colors.success : colors.warning}
                />
                <AppText
                  variant="caption"
                  color={user?.emailVerified ? colors.success : colors.warning}
                >
                  {user?.emailVerified ? 'Verified' : 'Unverified'}
                </AppText>
              </View>
            </View>
          </View>
        </SurfaceCard>
      </AnimatedEntrance>

      {!user?.emailVerified ? (
        <NoticeCard tone="warning" icon="mail-unread-outline" title="Email needs verification">
          Open the verification message we sent before using protected marketplace features.
        </NoticeCard>
      ) : null}

      <AnimatedEntrance delay={130} style={styles.section}>
        <AppText variant="subtitle">Account</AppText>
        <SettingsRow
          icon="person-outline"
          title="Update account"
          subtitle="Name, phone, skills and profile picture"
          onPress={() => router.push('/(tabs)/profile/personal-info')}
        />
        <SettingsRow
          icon="lock-closed-outline"
          title="Change password"
          subtitle="Update your account password securely"
          onPress={() => router.push('/(tabs)/profile/change-password')}
        />
        {user?.role === 'CLIENT' ? (
          <SettingsRow
            icon="star-outline"
            title="My reviews"
            subtitle="See your rating and feedback from workers"
            onPress={() => router.push('/(tabs)/profile/reviews' as never)}
          />
        ) : null}
        {user?.role === 'RUNNER' ? (
          <>
            <SettingsRow
              icon="shield-checkmark-outline"
              title="Identity verification"
              subtitle="Check, complete or appeal your KYC status"
              onPress={() => router.push('/(tabs)/profile/kyc')}
            />
            <SettingsRow
              icon="business-outline"
              title="Payout bank"
              subtitle="Add or change the account for future earnings"
              onPress={() => router.push('/payout-account')}
            />
          </>
        ) : null}
      </AnimatedEntrance>

      <AnimatedEntrance delay={190} style={styles.section}>
        <AppText variant="subtitle">Preferences & support</AppText>
        <View
          style={[
            styles.themeRow,
            shadows.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.themeIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons
              name={isDark ? 'moon-outline' : 'sunny-outline'}
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.themeCopy}>
            <AppText variant="bodyMedium">Dark mode</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {isDark ? 'Dark appearance is on' : 'Light appearance is on'}
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Dark mode"
            value={isDark}
            onValueChange={(enabled) => setThemePreference(enabled ? 'dark' : 'light')}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <SettingsRow
          icon="people-outline"
          title="Emergency contact"
          subtitle="Add or update your trusted safety contact"
          onPress={() => router.push('/emergency-contact')}
        />
        <SettingsRow
          icon="help-circle-outline"
          title="Help and support"
          subtitle="Get help or report a problem"
          onPress={() => router.push('/(tabs)/profile/support')}
        />
      </AnimatedEntrance>

      <AnimatedEntrance delay={225}>
        <SurfaceCard style={styles.notificationCard}>
          <View style={styles.notificationTop}>
            <View style={[styles.notificationMark, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            </View>
            <Switch
              accessibilityLabel="Receive push notifications"
              disabled={savingNotifications}
              value={notificationsEnabled}
              onValueChange={(enabled) => void updateNotifications(enabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <AppText variant="subtitle">Push notifications</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Task updates, arrivals, payments and withdrawals
          </AppText>
        </SurfaceCard>
      </AnimatedEntrance>

      <AnimatedEntrance delay={240} style={styles.logout}>
        <Button
          label="Sign out"
          icon="log-out-outline"
          variant="danger"
          onPress={confirmSignOut}
          loading={signingOut}
        />
        <AppText variant="caption" color={colors.textMuted} style={styles.version}>
          TaskGrid v1.0.0
        </AppText>
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.lg },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refresh: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  identityCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  identity: { alignItems: 'center', gap: 3 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  section: { gap: spacing.md },
  themeRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  themeIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCopy: { flex: 1, gap: 2 },
  notificationCard: { gap: spacing.xs, padding: spacing.lg },
  notificationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  notificationMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logout: { gap: spacing.md, paddingTop: spacing.sm },
  version: { textAlign: 'center' },
});
