import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Camera,
  Map,
  Marker,
  TransformRequestManager,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { radius, spacing, useAppTheme } from '@/src/theme';

type Coordinates = { latitude: number; longitude: number };

export const OPEN_STREET_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '\u00a9 OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'openStreetMapTiles',
      type: 'raster',
      source: 'openStreetMap',
    },
  ],
};

TransformRequestManager.addHeader({
  id: 'taskgrid-openstreetmap-user-agent',
  match: '^https://tile\\.openstreetmap\\.org/',
  name: 'User-Agent',
  value: 'TaskGrid/1.0 (com.taskgrid.mobile)',
});

export function WorkerLocationMap() {
  const { colors } = useAppTheme();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [label, setLabel] = useState('Checking your current location...');
  const [mapUnavailable, setMapUnavailable] = useState(false);

  async function locate() {
    setMapUnavailable(false);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setLabel('Location access is off. Tap to try again.');
      return;
    }

    try {
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinates = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };
      setLocation(coordinates);

      const addresses = await Location.reverseGeocodeAsync(coordinates).catch(() => []);
      const address = addresses[0];
      setLabel(
        address
          ? [address.district, address.city, address.region].filter(Boolean).join(', ')
          : 'Your current position',
      );
    } catch {
      setLabel('Current location is unavailable. Tap to retry.');
    }
  }

  function openAttribution() {
    void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => undefined);
  }

  useEffect(() => {
    void locate();
  }, []);

  const mapCoordinates: [number, number] | null = location
    ? [location.longitude, location.latitude]
    : null;

  return (
    <View style={styles.section}>
      <View>
        <AppText variant={'subtitle'}>Your location</AppText>
        <AppText variant={'caption'} color={colors.textMuted}>
          Used to surface nearby task opportunities
        </AppText>
      </View>

      <View
        style={[
          styles.shell,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        ]}
      >
        {mapCoordinates && !mapUnavailable ? (
          <Map
            style={styles.map}
            mapStyle={OPEN_STREET_MAP_STYLE}
            androidView={'texture'}
            preferredFramesPerSecond={30}
            dragPan={false}
            touchZoom={false}
            doubleTapZoom={false}
            doubleTapHoldZoom={false}
            touchRotate={false}
            touchPitch={false}
            compass={false}
            scaleBar={false}
            logo={false}
            attribution={false}
            onDidFailLoadingMap={() => setMapUnavailable(true)}
          >
            <Camera initialViewState={{ center: mapCoordinates, zoom: 14 }} />
            <Marker id={'worker-current-location'} lngLat={mapCoordinates} anchor={'bottom'}>
              <View
                collapsable={false}
                style={[
                  styles.marker,
                  { backgroundColor: colors.primary, borderColor: colors.surface },
                ]}
              >
                <Ionicons name={'person'} size={19} color={colors.textOnPrimary} />
              </View>
            </Marker>
          </Map>
        ) : (
          <Pressable onPress={locate} style={styles.placeholder}>
            <View style={[styles.pin, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={'location'} size={27} color={colors.primary} />
            </View>
            <AppText variant={'bodyMedium'}>
              {mapUnavailable
                ? 'Map preview unavailable. Tap to retry.'
                : 'Show my current location'}
            </AppText>
          </Pressable>
        )}

        {mapCoordinates && !mapUnavailable ? (
          <Pressable
            accessibilityRole={'link'}
            accessibilityLabel={'Open OpenStreetMap copyright information'}
            onPress={openAttribution}
            style={[styles.attribution, { backgroundColor: colors.surface }]}
          >
            <AppText variant={'caption'} color={colors.textMuted}>
              {'\u00a9 OpenStreetMap contributors'}
            </AppText>
          </Pressable>
        ) : null}

        <View style={[styles.label, { backgroundColor: colors.surface }]}>
          <Ionicons name={'navigate-circle-outline'} size={19} color={colors.primary} />
          <AppText variant={'caption'} numberOfLines={1} style={styles.labelText}>
            {label}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  shell: { height: 210, borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  map: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pin: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  attribution: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    opacity: 0.9,
  },
  label: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    minHeight: 44,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labelText: { flex: 1 },
});
