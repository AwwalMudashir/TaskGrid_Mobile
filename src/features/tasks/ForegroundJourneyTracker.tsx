import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/src/features/auth/AuthContext';
import { taskApi } from '@/src/features/tasks/task-api';

/**
 * Shares an accepted worker's position only while TaskGrid is in the foreground
 * and the worker has explicitly started/resumed the journey. This intentionally
 * does not register an Expo background-location task.
 */
export function ForegroundJourneyTracker() {
  const { user } = useAuth();
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const trackedTaskId = useRef<string | null>(null);
  const checking = useRef(false);

  useEffect(() => {
    if (user?.role !== 'RUNNER') return;
    let mounted = true;
    let appState: AppStateStatus = AppState.currentState;

    const stopWatcher = () => {
      watcher.current?.remove();
      watcher.current = null;
      trackedTaskId.current = null;
    };

    const sync = async () => {
      if (!mounted || checking.current || appState !== 'active') return;
      checking.current = true;
      try {
        const journey = await taskApi.activeJourney();
        if (!mounted || !journey?.sharing || !journey.taskId) {
          stopWatcher();
          return;
        }
        if (watcher.current && trackedTaskId.current === journey.taskId) return;
        stopWatcher();
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted || !mounted) return;
        trackedTaskId.current = journey.taskId;
        watcher.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 15_000,
            distanceInterval: 25,
          },
          (position) => {
            const taskId = trackedTaskId.current;
            if (!taskId || appState !== 'active') return;
            void taskApi
              .updateJourney(taskId, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              })
              .catch(() => undefined);
          },
        );
      } catch {
        // Journey tracking must never crash or block the rest of the app.
      } finally {
        checking.current = false;
      }
    };

    const appStateSubscription = AppState.addEventListener('change', (next) => {
      appState = next;
      if (next !== 'active') stopWatcher();
      else void sync();
    });
    void sync();
    const timer = setInterval(() => void sync(), 12_000);
    return () => {
      mounted = false;
      clearInterval(timer);
      appStateSubscription.remove();
      stopWatcher();
    };
  }, [user?.id, user?.role]);

  return null;
}
