import * as SecureStore from 'expo-secure-store';

import type { User } from '@/src/features/auth/types';

const TOUR_VERSION = 'v2';
const PENDING_TOUR_KEY = `taskgrid.featureTour.pending.${TOUR_VERSION}`;

function completedKey(userId: string) {
  return `taskgrid.featureTour.completed.${TOUR_VERSION}.${userId}`;
}

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Marks a newly registered account to receive the tour after its first login. */
export async function markFeatureTourPending(email: string) {
  await SecureStore.setItemAsync(PENDING_TOUR_KEY, normaliseEmail(email));
}

/**
 * Consumes the marker before showing the tour. Once this returns true, later
 * logins will not show the tour again, even when the user skips it.
 */
export async function consumePendingFeatureTour(user: User): Promise<boolean> {
  const alreadyShown = await SecureStore.getItemAsync(completedKey(user.id));
  if (alreadyShown === 'shown') return false;

  const pendingEmail = await SecureStore.getItemAsync(PENDING_TOUR_KEY);
  if (pendingEmail !== normaliseEmail(user.email)) return false;

  await SecureStore.setItemAsync(completedKey(user.id), 'shown');
  await SecureStore.deleteItemAsync(PENDING_TOUR_KEY);
  return true;
}
