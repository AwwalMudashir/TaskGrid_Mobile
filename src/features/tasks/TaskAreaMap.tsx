import Ionicons from '@expo/vector-icons/Ionicons';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';

import { OPEN_STREET_MAP_STYLE } from '@/src/components/home/WorkerLocationMap';
import { AppText } from '@/src/components/ui/AppText';
import { radius, spacing, useAppTheme } from '@/src/theme';

export function TaskAreaMap({
  latitude,
  longitude,
  zoneName,
  distanceKm,
  estimatedTravelMinutes,
  exact,
}: {
  latitude: number;
  longitude: number;
  zoneName: string | null;
  distanceKm: number | null;
  estimatedTravelMinutes: number | null;
  exact: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <AppText variant="eyebrow" color={colors.primary}>
            {exact ? 'Task location' : 'Approximate area'}
          </AppText>
          <AppText variant="subtitle">{zoneName ?? 'Nearby task area'}</AppText>
        </View>
        {distanceKm != null ? (
          <View style={[styles.distance, { backgroundColor: colors.primarySoft }]}>
            <AppText variant="bodyMedium" color={colors.primary}>
              {distanceKm.toFixed(1)} km
            </AppText>
            {estimatedTravelMinutes != null ? (
              <AppText variant="caption" color={colors.primary}>
                about {estimatedTravelMinutes} min
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.mapShell, { borderColor: colors.border }]}>
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
          <Camera initialViewState={{ center: [longitude, latitude], zoom: exact ? 15 : 12.5 }} />
          <Marker id="task-area-location" lngLat={[longitude, latitude]} anchor="center">
            <View
              collapsable={false}
              style={[
                styles.markerHalo,
                { backgroundColor: exact ? `${colors.success}2B` : `${colors.primary}26` },
              ]}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: exact ? colors.success : colors.primary,
                    borderColor: colors.surface,
                  },
                ]}
              >
                <Ionicons name={exact ? 'location' : 'briefcase'} size={20} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        </Map>
        <AppText
          variant="caption"
          color={colors.textMuted}
          style={[styles.attribution, { backgroundColor: colors.surface }]}
        >
          © OpenStreetMap contributors
        </AppText>
      </View>

      {!exact ? (
        <AppText variant="caption" color={colors.textMuted} style={styles.privacyNote}>
          The pin is intentionally approximate. The exact address is shared only if the client
          accepts you.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, paddingVertical: spacing.sm },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: { flex: 1, gap: 3 },
  distance: {
    alignItems: 'flex-end',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapShell: { height: 270, overflow: 'hidden', borderWidth: 1, borderRadius: radius.xl },
  map: { flex: 1 },
  markerHalo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  attribution: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  privacyNote: { lineHeight: 19, paddingHorizontal: spacing.xs },
});
