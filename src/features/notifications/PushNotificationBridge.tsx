import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/src/features/auth/AuthContext';
import {
  arePushNotificationsEnabled,
  registerCurrentDeviceForPush,
  type TaskNotificationData,
} from '@/src/features/notifications/push-notifications';

export function PushNotificationBridge() {
  const { user } = useAuth();
  const router = useRouter();
  const notificationResponse = Notifications.useLastNotificationResponse();
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void arePushNotificationsEnabled()
      .then((enabled) => (enabled ? registerCurrentDeviceForPush() : null))
      .catch((cause) => {
        // Registration cannot block sign-in, but keep a development breadcrumb.
        if (__DEV__) console.warn('TaskGrid push registration failed', cause);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user || !notificationResponse) return;

    const responseId = `${notificationResponse.notification.request.identifier}:${notificationResponse.actionIdentifier}`;
    if (handledResponseId.current === responseId) return;
    handledResponseId.current = responseId;

    const data = notificationResponse.notification.request.content.data as TaskNotificationData;
    Notifications.clearLastNotificationResponse();
    if (
      data?.route === '/wallet' ||
      data?.type === 'TASK_EARNINGS_RELEASED' ||
      data?.type === 'WITHDRAWAL_SUCCEEDED' ||
      data?.type === 'WITHDRAWAL_FAILED'
    ) {
      router.push('/(tabs)/wallet');
      return;
    }
    if (data?.type === 'CHAT_MESSAGE' && data.taskId) {
      router.push({ pathname: '/task/[id]/chat', params: { id: data.taskId } } as never);
      return;
    }
    if (data?.taskId) {
      router.push({ pathname: '/task/[id]', params: { id: data.taskId } });
    }
  }, [notificationResponse, router, user]);

  return null;
}
