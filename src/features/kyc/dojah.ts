import { Platform } from 'react-native';

import type { User } from '@/src/features/auth/types';
import type { DojahLaunchResult, KycSession } from '@/src/features/kyc/types';

const knownResults = new Set<DojahLaunchResult>(['approved', 'pending', 'failed', 'closed']);

export async function launchDojahKyc(session: KycSession, user: User) {
  if (Platform.OS === 'web') {
    throw new Error('Identity verification is available in the TaskGrid Android and iOS apps.');
  }

  // Loading the native module only when the user starts KYC keeps the rest of the
  // app usable in Expo Go. The actual verification flow needs a development build.
  const { default: DojahKycSdk } = await import('dojah-kyc-sdk-react-expo');
  const nameParts = user.fullName.trim().split(/\s+/);
  const firstName = nameParts.shift() ?? '';
  const lastName = nameParts.join(' ');

  const result = await DojahKycSdk.launch(session.widgetId, session.referenceId, user.email, {
    userData: {
      firstName,
      lastName,
      email: user.email,
    },
    metadata: {
      taskgridUserId: user.id,
      referenceId: session.referenceId,
      environment: session.environment,
    },
  });

  const normalized = result.trim().toLowerCase() as DojahLaunchResult;
  return knownResults.has(normalized) ? normalized : 'unknown';
}
