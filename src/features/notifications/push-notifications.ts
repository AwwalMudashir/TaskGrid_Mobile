import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiRequest } from '@/src/lib/api';

const TOKEN_KEY = 'taskgrid.expoPushToken';
const PREFERENCE_KEY = 'taskgrid.pushNotificationsEnabled';

export type PushRegistrationResult =
  | { registered: true; token: string }
  | {
      registered: false;
      reason: 'disabled' | 'permission-denied' | 'permission-pending' | 'unavailable';
    };

export type PushPreferenceResult =
  | { enabled: true; registration: 'registered'; token: string }
  | {
      enabled: true;
      registration: 'pending';
      reason: 'permission-pending' | 'unavailable';
    }
  | { enabled: false; registration: 'disabled'; reason: 'disabled' | 'permission-denied' };

export type TaskNotificationData = {
  type?:
    | 'BID_RECEIVED'
    | 'BID_ACCEPTED'
    | 'PAYMENT_HELD'
    | 'TASK_EN_ROUTE'
    | 'TASK_ARRIVAL'
    | 'CHAT_MESSAGE'
    | 'TASK_COMPLETION_SUBMITTED'
    | 'TASK_REVIEW_REMINDER'
    | 'TASK_DISPUTED'
    | 'DISPUTE_RESOLVED'
    | 'TASK_EARNINGS_RELEASED'
    | 'WITHDRAWAL_SUCCEEDED'
    | 'WITHDRAWAL_FAILED';
  taskId?: string;
  withdrawalId?: string;
  route?: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerCurrentDeviceForPush(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') return { registered: false, reason: 'unavailable' };

  if (!(await arePushNotificationsEnabled())) {
    return { registered: false, reason: 'disabled' };
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('task-updates', {
        name: 'Task updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 200, 250],
        lightColor: '#635BFF',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      if (permission.canAskAgain === false) {
        await SecureStore.setItemAsync(PREFERENCE_KEY, 'false');
        return { registered: false, reason: 'permission-denied' };
      }
      return { registered: false, reason: 'permission-pending' };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      throw new Error('Expo project ID is missing from the application configuration.');
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await apiRequest<void>('/notifications/devices', {
      method: 'POST',
      body: { token },
      authenticated: true,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return { registered: true, token };
  } catch (cause) {
    logPushFailure('Device registration failed', cause);
    return { registered: false, reason: 'unavailable' };
  }
}

export async function arePushNotificationsEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PREFERENCE_KEY);
  return stored !== 'false';
}

export async function setPushNotificationsEnabled(enabled: boolean): Promise<PushPreferenceResult> {
  // The stored value represents the user's choice. Device registration is a
  // separate operation and must not silently rewrite that choice after a
  // temporary network, Expo or backend failure.
  await SecureStore.setItemAsync(PREFERENCE_KEY, enabled ? 'true' : 'false');

  if (!enabled) {
    try {
      await unregisterCurrentDeviceForPush();
    } catch {
      // The preference is already off. The bridge retries token removal after
      // the next authenticated session while a local token still exists.
    }
    return { enabled: false, registration: 'disabled', reason: 'disabled' };
  }

  const result = await registerCurrentDeviceForPush();
  if (result.registered) {
    return { enabled: true, registration: 'registered', token: result.token };
  }

  if (result.reason === 'permission-denied') {
    return { enabled: false, registration: 'disabled', reason: 'permission-denied' };
  }

  return {
    enabled: true,
    registration: 'pending',
    reason: result.reason === 'permission-pending' ? 'permission-pending' : 'unavailable',
  };
}

export async function unregisterCurrentDeviceForPush(): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  try {
    await apiRequest<void>('/notifications/devices', {
      method: 'DELETE',
      body: { token },
      authenticated: true,
    });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (cause) {
    logPushFailure('Device unregistration failed', cause);
    throw cause;
  }
}

function logPushFailure(context: string, cause: unknown) {
  const detail =
    cause instanceof Error
      ? { name: cause.name, message: cause.message, stack: cause.stack }
      : { cause };
  console.warn(`[TaskGrid push] ${context}`, detail);
}
