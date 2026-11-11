import { Redirect } from 'expo-router';

import { useAuth } from '@/src/features/auth/AuthContext';

/**
 * Handles navigation state and old links created before the policy screen was
 * separated into authenticated and registration routes.
 */
export default function LegacyPrivacyPolicyRedirect() {
  const { user } = useAuth();

  return (
    <Redirect href={user ? ('/(tabs)/profile/privacy-policy' as never) : '/(auth)/login'} />
  );
}
