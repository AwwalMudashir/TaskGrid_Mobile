import Ionicons from '@expo/vector-icons/Ionicons';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { OPEN_STREET_MAP_STYLE } from '@/src/components/home/WorkerLocationMap';
import { AppText } from '@/src/components/ui/AppText';
import type { Coordinates } from '@/src/features/tasks/task-api';
import { radius, spacing, useAppTheme } from '@/src/theme';

function lastUpdateLabel(updatedAt: string | null, now: number) {
  if (!updatedAt) return 'Waiting for the first journey update';
  const updatedTime = new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedTime)) return 'Latest location time unavailable';
  const elapsedMinutes = Math.max(0, Math.floor((now - updatedTime) / 60_000));
  if (elapsedMinutes < 1) return 'Location updated just now';
  if (elapsedMinutes < 60)
    return `Location updated ${elapsedMinutes} ${elapsedMinutes === 1 ? 'minute' : 'minutes'} ago`;
  if (elapsedMinutes < 24 * 60) {
    const hours = Math.floor(elapsedMinutes / 60);
    return `Location updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  return `Location updated ${new Date(updatedAt).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function TaskJourneyMap({
  taskLocation,
  workerLocation,
  updatedAt,
  onStopSharing,
  stopping = false,
}: {
  taskLocation: Coordinates;
  workerLocation: Coordinates | null;
  updatedAt: string | null;
  onStopSharing?: () => void;
  stopping?: boolean;
}) {
  const { colors } = useAppTheme();
  const centre = workerLocation ?? taskLocation;
  const [now, setNow] = useState(Date.now());
  const updateAge = updatedAt ? now - new Date(updatedAt).getTime() : null;
  const updateIsStale = updateAge != null && Number.isFinite(updateAge) && updateAge > 120_000;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.section}>
      <View>
        <AppText variant="subtitle">Task journey</AppText>
        <AppText variant="caption" color={updateIsStale ? colors.warning : colors.textMuted}>
          {workerLocation
            ? lastUpdateLabel(updatedAt, now)
            : 'The worker location appears here only while sharing is on.'}
        </AppText>
      </View>
      <View style={[styles.shell, { borderColor: colors.border }]}>
        <Map
          style={styles.map}
          mapStyle={OPEN_STREET_MAP_STYLE}
          androidView="texture"
          compass={false}
          scaleBar={false}
          logo={false}
          attribution={false}
        >
          <Camera initialViewState={{ center: [centre.longitude, centre.latitude], zoom: 14 }} />
          <Marker
            id="task-destination"
            lngLat={[taskLocation.longitude, taskLocation.latitude]}
            anchor="bottom"
          >
            <View
              collapsable={false}
              style={[
                styles.marker,
                { backgroundColor: colors.primary, borderColor: colors.surface },
              ]}
            >
              <Ionicons name="flag" size={17} color={colors.textOnPrimary} />
            </View>
          </Marker>
          {workerLocation ? (
            <Marker
              id="assigned-worker-location"
              lngLat={[workerLocation.longitude, workerLocation.latitude]}
              anchor="center"
            >
              <View
                collapsable={false}
                style={[
                  styles.worker,
                  { backgroundColor: colors.info, borderColor: colors.surface },
                ]}
              >
                <Ionicons name="navigate" size={16} color={colors.textOnPrimary} />
              </View>
            </Marker>
          ) : null}
        </Map>
        {onStopSharing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop sharing journey location"
            disabled={stopping}
            onPress={onStopSharing}
            style={({ pressed }) => [
              styles.stopSharing,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed || stopping ? 0.72 : 1,
              },
            ]}
          >
            {stopping ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="stop-circle-outline" size={23} color={colors.danger} />
            )}
          </Pressable>
        ) : null}
        <View
          pointerEvents="none"
          style={[styles.attribution, { backgroundColor: colors.surface }]}
        >
          <AppText variant="caption" color={colors.textMuted}>
            © OpenStreetMap contributors
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  shell: { height: 260, borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  map: { flex: 1 },
  stopSharing: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    opacity: 0.9,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  worker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
