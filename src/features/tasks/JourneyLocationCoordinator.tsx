import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/src/features/auth/AuthContext';
import {
  stopJourneyLocationTracking,
  syncJourneyLocationTracking,
} from '@/src/features/tasks/journey-location-task';

/**
 * Reconciles the native journey task with the server whenever the app is active.
 * Actual updates are delivered by the module-scope background task, so briefly
 * locking the phone or opening another app does not interrupt an agreed journey.
 */
export function JourneyLocationCoordinator() {
  const { user } = useAuth();
  const checking = useRef(false);

  useEffect(() => {
    let mounted = true;
    let appState: AppStateStatus = AppState.currentState;

    const sync = async () => {
      if (!mounted || checking.current || appState !== 'active') return;
      checking.current = true;
      try {
        if (user?.role === 'RUNNER') await syncJourneyLocationTracking();
        else await stopJourneyLocationTracking();
      } catch {
        // Journey tracking must never crash or block the rest of the app.
      } finally {
        checking.current = false;
      }
    };

    const appStateSubscription = AppState.addEventListener('change', (next) => {
      appState = next;
      if (next === 'active') void sync();
    });
    void sync();
    const timer = setInterval(() => void sync(), 12_000);
    return () => {
      mounted = false;
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [user?.id, user?.role]);

  return null;
}
