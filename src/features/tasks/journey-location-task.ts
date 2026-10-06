import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { taskApi } from '@/src/features/tasks/task-api';
import { ApiError } from '@/src/lib/api';

export const JOURNEY_LOCATION_TASK = 'taskgrid-active-journey-location';

const ACTIVE_JOURNEY_KEY = 'taskgrid.activeJourneyTaskId';
const LOCATION_INTERVAL_MS = 30_000;

type JourneyLocationTaskData = {
  locations?: Location.LocationObject[];
};

/**
 * This task must remain at module scope. Android may start the JavaScript bundle
 * in the background without mounting any React components.
 */
if (!TaskManager.isTaskDefined(JOURNEY_LOCATION_TASK)) {
  TaskManager.defineTask<JourneyLocationTaskData>(JOURNEY_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;

    const taskId = await SecureStore.getItemAsync(ACTIVE_JOURNEY_KEY);
    const latestLocation = data.locations?.at(-1);
    if (!taskId || !latestLocation) {
      if (!taskId) await stopJourneyLocationTracking();
      return;
    }

    try {
      const journey = await taskApi.updateJourney(taskId, {
        latitude: latestLocation.coords.latitude,
        longitude: latestLocation.coords.longitude,
      });

      if (!journey.sharing || journey.taskStatus !== 'EN_ROUTE') {
        await stopJourneyLocationTracking();
      }
    } catch (cause) {
      // Network outages are temporary. Authorization, missing-task and lifecycle
      // conflicts mean this journey is no longer allowed to keep tracking.
      if (cause instanceof ApiError && [401, 403, 404, 409].includes(cause.code)) {
        await stopJourneyLocationTracking();
      }
    }
  });
}

export async function requestJourneyLocationPermissions() {
  if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) {
    throw new Error('Journey location sharing needs the installed TaskGrid app.');
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('Turn on your phone location, then try again.');
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    throw new Error('Allow precise location while using TaskGrid to start your journey.');
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) {
    throw new Error(
      'Choose Allow all the time in location settings so journey sharing can continue when TaskGrid is in the background.',
    );
  }
}

export async function startJourneyLocationTracking(taskId: string) {
  const currentlyTrackedTask = await SecureStore.getItemAsync(ACTIVE_JOURNEY_KEY);
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(JOURNEY_LOCATION_TASK);

  if (alreadyRegistered && currentlyTrackedTask === taskId) return;
  if (alreadyRegistered) await Location.stopLocationUpdatesAsync(JOURNEY_LOCATION_TASK);

  await SecureStore.setItemAsync(ACTIVE_JOURNEY_KEY, taskId);
  try {
    await Location.startLocationUpdatesAsync(JOURNEY_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_INTERVAL_MS,
      deferredUpdatesInterval: LOCATION_INTERVAL_MS,
      activityType: Location.ActivityType.OtherNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'TaskGrid journey active',
        notificationBody: 'Sharing your location for your current task',
        notificationColor: '#635BFF',
        killServiceOnDestroy: false,
      },
    });
  } catch (cause) {
    await SecureStore.deleteItemAsync(ACTIVE_JOURNEY_KEY);
    throw cause;
  }
}

export async function stopJourneyLocationTracking() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(JOURNEY_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(JOURNEY_LOCATION_TASK);
    }
  } finally {
    await SecureStore.deleteItemAsync(ACTIVE_JOURNEY_KEY);
  }
}

export async function syncJourneyLocationTracking() {
  const trackedTaskId = await SecureStore.getItemAsync(ACTIVE_JOURNEY_KEY);
  const journey = await taskApi.activeJourney();

  if (!journey?.taskId || !journey.sharing || journey.taskStatus !== 'EN_ROUTE') {
    await stopJourneyLocationTracking();
    return;
  }

  // Consent is stored against one task only. Never silently start tracking a
  // different journey, even if the server says it is active.
  if (trackedTaskId !== journey.taskId) return;

  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  if (!foreground.granted || !background.granted) {
    await stopJourneyLocationTracking();
    return;
  }

  if (!(await TaskManager.isTaskRegisteredAsync(JOURNEY_LOCATION_TASK))) {
    await startJourneyLocationTracking(journey.taskId);
  }
}

export async function stopJourneySharingBeforeSignOut() {
  const taskId = await SecureStore.getItemAsync(ACTIVE_JOURNEY_KEY);
  try {
    if (taskId) await taskApi.stopSharing(taskId);
  } catch {
    // Local tracking must still stop if the server cannot be reached.
  } finally {
    await stopJourneyLocationTracking();
  }
}
