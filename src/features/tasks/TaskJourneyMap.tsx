import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const hours = Math.floor(elapsedMinutes / 60);
  return `Location updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

function distanceLabel(distanceMetres: number | null) {
  if (distanceMetres == null) return 'Calculating distance';
  if (distanceMetres < 1_000) return `${Math.max(0, Math.round(distanceMetres))} m away`;
  return `${(distanceMetres / 1_000).toFixed(1)} km away`;
}

type Props = {
  taskLocation: Coordinates;
  workerLocation: Coordinates | null;
  updatedAt: string | null;
  distanceToTaskMetres: number | null;
  estimatedTravelMinutes: number | null;
  onStopSharing?: () => void;
  stopping?: boolean;
};

export function TaskJourneyMap(props: Props) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const updateAge = props.updatedAt ? now - new Date(props.updatedAt).getTime() : null;
  const updateIsStale = updateAge != null && Number.isFinite(updateAge) && updateAge > 120_000;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <AppText variant="subtitle">Live journey</AppText>
          <AppText variant="caption" color={updateIsStale ? colors.warning : colors.textMuted}>
            {props.workerLocation
              ? lastUpdateLabel(props.updatedAt, now)
              : 'The worker location appears here while journey sharing is active.'}
          </AppText>
        </View>
        <View style={[styles.liveSignal, { backgroundColor: colors.successSoft }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
          <AppText variant="caption" color={colors.success}>
            LIVE
          </AppText>
        </View>
      </View>

      <JourneyMapCanvas {...props} onExpand={() => setExpanded(true)} />

      <View style={styles.journeySummary}>
        <View>
          <AppText variant="bodyMedium">{distanceLabel(props.distanceToTaskMetres)}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Straight-line proximity
          </AppText>
        </View>
        <View style={styles.summaryRight}>
          <AppText variant="bodyMedium">
            {props.estimatedTravelMinutes != null
              ? `About ${props.estimatedTravelMinutes} min`
              : 'Estimate pending'}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Approximate travel time
          </AppText>
        </View>
      </View>

      <Modal
        visible={expanded}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setExpanded(false)}
      >
        <ExpandedJourneyMap {...props} onClose={() => setExpanded(false)} />
      </Modal>
    </View>
  );
}

function ExpandedJourneyMap({ onClose, ...props }: Props & { onClose: () => void }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.expanded, { backgroundColor: colors.background }]}>
      <JourneyMapCanvas {...props} expanded />
      <View style={[styles.expandedTop, { top: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close expanded journey map"
          onPress={onClose}
          style={[
            styles.roundControl,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="close" size={25} color={colors.text} />
        </Pressable>
        <View style={[styles.expandedTitle, { backgroundColor: colors.surface }]}>
          <AppText variant="bodyMedium">Track journey</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {distanceLabel(props.distanceToTaskMetres)}
          </AppText>
        </View>
      </View>
      <View
        style={[
          styles.expandedBottom,
          { bottom: insets.bottom + spacing.lg, backgroundColor: colors.surface },
        ]}
      >
        <View>
          <AppText variant="subtitle">{distanceLabel(props.distanceToTaskMetres)}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {props.estimatedTravelMinutes != null
              ? `Roughly ${props.estimatedTravelMinutes} min away`
              : 'Travel estimate will appear after a location update'}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          {lastUpdateLabel(props.updatedAt, Date.now())}
        </AppText>
      </View>
    </View>
  );
}

function JourneyMapCanvas({
  taskLocation,
  workerLocation,
  onStopSharing,
  stopping,
  onExpand,
  expanded = false,
}: Props & { onExpand?: () => void; expanded?: boolean }) {
  const { colors } = useAppTheme();
  const camera = useRef<CameraRef>(null);
  const [following, setFollowing] = useState(true);
  const centre = workerLocation ?? taskLocation;
  const line = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(
    () =>
      workerLocation
        ? {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [workerLocation.longitude, workerLocation.latitude],
                [taskLocation.longitude, taskLocation.latitude],
              ],
            },
          }
        : null,
    [taskLocation.latitude, taskLocation.longitude, workerLocation],
  );

  function fitJourney(duration = 700) {
    if (!workerLocation) {
      camera.current?.easeTo({
        center: [taskLocation.longitude, taskLocation.latitude],
        zoom: 15,
        duration,
      });
      return;
    }
    camera.current?.fitBounds(
      [
        Math.min(workerLocation.longitude, taskLocation.longitude),
        Math.min(workerLocation.latitude, taskLocation.latitude),
        Math.max(workerLocation.longitude, taskLocation.longitude),
        Math.max(workerLocation.latitude, taskLocation.latitude),
      ],
      {
        padding: expanded
          ? { top: 130, right: 70, bottom: 210, left: 70 }
          : { top: 55, right: 45, bottom: 55, left: 45 },
        duration,
      },
    );
  }

  useEffect(() => {
    if (!following) return;
    const timer = setTimeout(() => fitJourney(), 150);
    return () => clearTimeout(timer);
  }, [expanded, following, taskLocation.latitude, taskLocation.longitude, workerLocation]);

  return (
    <View
      style={[
        expanded ? styles.fullMapShell : styles.shell,
        !expanded && { borderColor: colors.border },
      ]}
    >
      <Map
        style={styles.map}
        mapStyle={OPEN_STREET_MAP_STYLE}
        androidView="texture"
        compass={expanded}
        scaleBar={expanded}
        logo={false}
        attribution={false}
        onRegionWillChange={(event) => {
          if (event.nativeEvent.userInteraction) setFollowing(false);
        }}
      >
        <Camera
          ref={camera}
          initialViewState={{ center: [centre.longitude, centre.latitude], zoom: 14 }}
        />
        {line ? (
          <GeoJSONSource id={`journey-line-${expanded ? 'expanded' : 'inline'}`} data={line}>
            <Layer
              id={`journey-line-layer-${expanded ? 'expanded' : 'inline'}`}
              type="line"
              paint={{
                'line-color': colors.primary,
                'line-width': 4,
                'line-opacity': 0.7,
                'line-dasharray': [2, 2],
              }}
            />
          </GeoJSONSource>
        ) : null}
        <Marker
          id={`task-destination-${expanded ? 'expanded' : 'inline'}`}
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
            id={`assigned-worker-location-${expanded ? 'expanded' : 'inline'}`}
            lngLat={[workerLocation.longitude, workerLocation.latitude]}
            anchor="center"
          >
            <View
              collapsable={false}
              style={[styles.workerPulse, { borderColor: `${colors.info}35` }]}
            >
              <View
                style={[
                  styles.worker,
                  { backgroundColor: colors.info, borderColor: colors.surface },
                ]}
              >
                <Ionicons name="navigate" size={16} color={colors.textOnPrimary} />
              </View>
            </View>
          </Marker>
        ) : null}
      </Map>

      {onExpand ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Expand live journey map"
          onPress={onExpand}
          style={[styles.expand, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="expand-outline" size={22} color={colors.text} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Follow worker on map"
        onPress={() => {
          setFollowing(true);
          fitJourney();
        }}
        style={[
          styles.follow,
          expanded && styles.followExpanded,
          {
            backgroundColor: following ? colors.primary : colors.surface,
            borderColor: following ? colors.primary : colors.border,
          },
        ]}
      >
        <Ionicons
          name="locate-outline"
          size={21}
          color={following ? colors.textOnPrimary : colors.primary}
        />
        {expanded ? (
          <AppText variant="caption" color={following ? colors.textOnPrimary : colors.primary}>
            Follow
          </AppText>
        ) : null}
      </Pressable>

      {onStopSharing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop sharing journey location"
          disabled={stopping}
          onPress={onStopSharing}
          style={[
            styles.stopSharing,
            expanded && styles.stopSharingExpanded,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: stopping ? 0.72 : 1,
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

      <View pointerEvents="none" style={[styles.attribution, { backgroundColor: colors.surface }]}>
        <AppText variant="caption" color={colors.textMuted}>
          {'\u00a9 OpenStreetMap contributors'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headingCopy: { flex: 1, gap: 2 },
  liveSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  shell: { height: 300, borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  fullMapShell: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  map: { flex: 1 },
  journeySummary: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  summaryRight: { alignItems: 'flex-end' },
  expanded: { flex: 1 },
  expandedTop: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roundControl: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedTitle: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  expandedBottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  expand: {
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
  follow: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    minWidth: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  followExpanded: { bottom: 150 },
  stopSharing: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSharingExpanded: { top: 92 },
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
  workerPulse: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 8,
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
