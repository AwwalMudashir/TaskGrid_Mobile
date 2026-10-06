import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiRequest } from '@/src/lib/api';

const TOKEN_KEY = 'taskgrid.expoPushToken';
const PREFERENCE_KEY = 'taskgrid.pushNotificationsEnabled';

export type PushPreferenceResult =
  | { enabled: true; token: string }
  | { enabled: false; reason?: 'disabled' | 'permission-denied' | 'unavailable' };

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

export async function registerCurrentDeviceForPush(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (!(await arePushNotificationsEnabled())) return null;

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
    await SecureStore.setItemAsync(PREFERENCE_KEY, 'false');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    await SecureStore.setItemAsync(PREFERENCE_KEY, 'false');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await apiRequest<void>('/notifications/devices', {
      method: 'POST',
      body: { token },
      authenticated: true,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return token;
  } catch (cause) {
    await SecureStore.setItemAsync(PREFERENCE_KEY, 'false');
    throw cause;
  }
}

export async function arePushNotificationsEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PREFERENCE_KEY);
  return stored !== 'false';
}

export async function setPushNotificationsEnabled(enabled: boolean): Promise<PushPreferenceResult> {
  if (!enabled) {
    await unregisterCurrentDeviceForPush();
    await SecureStore.setItemAsync(PREFERENCE_KEY, 'false');
    return { enabled: false, reason: 'disabled' };
  }

  // Save first so registerCurrentDeviceForPush is allowed to run. Roll back when
  // the OS or the build cannot provide a usable Expo token.
  await SecureStore.setItemAsync(PREFERENCE_KEY, 'true');
  const existingPermission = await Notifications.getPermissionsAsync();
  const token = await registerCurrentDeviceForPush();
  if (token) return { enabled: true, token };

  await SecureStore.setItemAsync(PREFERENCE_KEY, 'false');
  return {
    enabled: false,
    reason: existingPermission.canAskAgain === false ? 'permission-denied' : 'unavailable',
  };
}

export async function unregisterCurrentDeviceForPush(): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  await apiRequest<void>('/notifications/devices', {
    method: 'DELETE',
    body: { token },
    authenticated: true,
  });
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
