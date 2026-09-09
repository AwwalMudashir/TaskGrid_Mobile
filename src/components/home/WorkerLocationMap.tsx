import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { AppText } from '@/src/components/ui/AppText';
import { radius, spacing, useAppTheme } from '@/src/theme';

type Coordinates = { latitude: number; longitude: number };

export function WorkerLocationMap() {
  const { colors } = useAppTheme();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [label, setLabel] = useState('Checking your current location…');

  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setLabel('Location access is off. Tap to try again.');
      return;
    }
    try {
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinates = { latitude: result.coords.latitude, longitude: result.coords.longitude };
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

  useEffect(() => {
    locate();
  }, []);
  return (
    <View style={styles.section}>
      <View>
        <AppText variant="subtitle">Your location</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Used to surface nearby task opportunities
        </AppText>
      </View>
      <View
        style={[
          styles.shell,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        ]}
      >
        {location ? (
          <MapView
            style={styles.map}
            initialRegion={{ ...location, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <Marker coordinate={location} title="You are here" pinColor={colors.primary} />
          </MapView>
        ) : (
          <Pressable onPress={locate} style={styles.placeholder}>
            <View style={[styles.pin, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="location" size={27} color={colors.primary} />
            </View>
            <AppText variant="bodyMedium">Show my current location</AppText>
          </Pressable>
        )}
        <View style={[styles.label, { backgroundColor: colors.surface }]}>
          <Ionicons name="navigate-circle-outline" size={19} color={colors.primary} />
          <AppText variant="caption" numberOfLines={1} style={styles.labelText}>
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
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  pin: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
