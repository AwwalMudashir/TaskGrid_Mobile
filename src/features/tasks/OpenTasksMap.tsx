import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OPEN_STREET_MAP_STYLE } from '@/src/components/home/WorkerLocationMap';
import { AppText } from '@/src/components/ui/AppText';
import type { Coordinates, TaskCard } from '@/src/features/tasks/task-api';
import { radius, spacing, useAppTheme } from '@/src/theme';

export function OpenTasksMap({
  tasks,
  workerLocation,
  onSelect,
}: {
  tasks: TaskCard[];
  workerLocation: Coordinates | null;
  onSelect(task: TaskCard): void;
}) {
  const { colors } = useAppTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mappedTasks = useMemo(
    () => tasks.filter((task) => task.mapLatitude != null && task.mapLongitude != null),
    [tasks],
  );
  const selected = mappedTasks.find((task) => task.id === selectedId) ?? null;
  const taskHitAreas = useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Point, { taskId: string }>
  >(
    () => ({
      type: 'FeatureCollection',
      features: mappedTasks.map((task) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [task.mapLongitude!, task.mapLatitude!],
        },
        properties: { taskId: task.id },
      })),
    }),
    [mappedTasks],
  );
  const first = mappedTasks[0];
  const centre: [number, number] = workerLocation
    ? [workerLocation.longitude, workerLocation.latitude]
    : first
      ? [first.mapLongitude!, first.mapLatitude!]
      : [3.3792, 6.5244];

  return (
    <View
      style={[
        styles.shell,
        { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
      ]}
    >
      <Map
        style={styles.map}
        mapStyle={OPEN_STREET_MAP_STYLE}
        androidView="texture"
        preferredFramesPerSecond={30}
        compass={false}
        scaleBar={false}
        logo={false}
        attribution={false}
      >
        <Camera initialViewState={{ center: centre, zoom: 12 }} />
        {workerLocation ? (
          <Marker
            id="open-task-worker-location"
            lngLat={[workerLocation.longitude, workerLocation.latitude]}
            anchor="center"
          >
            <View
              collapsable={false}
              style={[
                styles.workerMarker,
                { backgroundColor: colors.info, borderColor: colors.surface },
              ]}
            >
              <Ionicons name="person" size={15} color={colors.textOnPrimary} />
            </View>
          </Marker>
        ) : null}
        {mappedTasks.length > 0 ? (
          <GeoJSONSource
            id="open-task-touch-targets"
            data={taskHitAreas}
            hitbox={{ top: 16, right: 16, bottom: 16, left: 16 }}
            onPress={(event) => {
              event.stopPropagation();
              const taskId = event.nativeEvent.features[0]?.properties?.taskId;
              if (typeof taskId === 'string') setSelectedId(taskId);
            }}
          >
            <Layer
              id="open-task-touch-layer"
              type="circle"
              paint={{
                'circle-radius': 28,
                'circle-color': colors.primary,
                'circle-opacity': 0.01,
              }}
            />
          </GeoJSONSource>
        ) : null}
        {mappedTasks.map((task) => (
          <Marker
            key={task.id}
            id={`open-task-${task.id}`}
            lngLat={[task.mapLongitude!, task.mapLatitude!]}
            anchor="center"
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Preview ${task.title}`}
            onPress={(event) => {
              event.stopPropagation();
              setSelectedId(task.id);
            }}
          >
            <Pressable
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${task.title}`}
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                setSelectedId(task.id);
              }}
              style={[
                styles.taskMarkerHalo,
                {
                  backgroundColor:
                    selected?.id === task.id ? `${colors.primary}42` : `${colors.primary}28`,
                },
              ]}
            >
              <View
                style={[
                  styles.taskMarker,
                  { backgroundColor: colors.primary, borderColor: colors.surface },
                ]}
              >
                <Ionicons name="briefcase" size={17} color={colors.textOnPrimary} />
              </View>
            </Pressable>
          </Marker>
        ))}
      </Map>

      {mappedTasks.length === 0 ? (
        <View pointerEvents="none" style={styles.emptyStatePosition}>
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <View style={[styles.emptyMarker, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="map-outline" size={25} color={colors.primary} />
            </View>
            <AppText variant="subtitle">No open tasks in this area</AppText>
            <AppText color={colors.textSecondary} style={styles.emptyCopy}>
              Try a wider search distance or check again when new tasks are posted.
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.attribution}>
            © OpenStreetMap contributors
          </AppText>
        </View>
      ) : selected ? (
        <View style={[styles.preview, { backgroundColor: colors.surface }]}>
          <View style={styles.previewCopy}>
            <AppText variant="caption" color={colors.primary}>
              {selected.category}
            </AppText>
            <AppText variant="bodyMedium" numberOfLines={1}>
              {selected.title}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {selected.distanceKm != null
                ? `${selected.distanceKm.toFixed(1)} km away`
                : 'Distance unavailable'}
              {selected.estimatedTravelMinutes != null
                ? ` · about ${selected.estimatedTravelMinutes} min`
                : ''}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${selected.title}`}
            onPress={() => onSelect(selected)}
            style={[styles.previewAction, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="arrow-forward" size={19} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.legend, { backgroundColor: colors.surface }]}>
          <AppText variant="caption" color={colors.textSecondary}>
            Pins show approximate areas. Tap one to preview the task.
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            © OpenStreetMap contributors
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { height: 390, borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  map: { flex: 1 },
  workerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskMarkerHalo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  legend: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  preview: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    elevation: 5,
  },
  previewCopy: { flex: 1, gap: 2 },
  previewAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStatePosition: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyState: {
    width: '100%',
    maxWidth: 310,
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    elevation: 4,
  },
  emptyMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyCopy: { textAlign: 'center' },
  attribution: { position: 'absolute', bottom: spacing.md },
});
