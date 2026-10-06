import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import type { LocalProfileImage } from '@/src/features/auth/types';
import { radius, spacing, useAppTheme } from '@/src/theme';

const MAX_PHOTOS = 5;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

type Props = {
  label: string;
  helper: string;
  images: LocalProfileImage[];
  onChange(images: LocalProfileImage[]): void;
  onError(message: string): void;
  existingCount?: number;
};

export function TaskPhotoPicker({
  label,
  helper,
  images,
  onChange,
  onError,
  existingCount = 0,
}: Props) {
  const { colors } = useAppTheme();
  const remaining = Math.max(0, MAX_PHOTOS - existingCount - images.length);

  async function choose(source: 'camera' | 'library') {
    if (remaining === 0) return onError('A task can have no more than 5 photos in this section.');
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError(`Allow TaskGrid to access your ${source === 'camera' ? 'camera' : 'photos'} first.`);
      return;
    }
    const result = await (source === 'camera'
      ? ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 })
      : ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: remaining,
          quality: 0.75,
        }));
    if (result.canceled) return;

    const selected = result.assets.slice(0, remaining).map((asset, index) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? `task-photo-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSize: asset.fileSize,
    }));
    const next = [...images, ...selected.filter((item) => !images.some((old) => old.uri === item.uri))];
    const knownBytes = next.reduce((total, item) => total + (item.fileSize ?? 0), 0);
    if (knownBytes > MAX_TOTAL_BYTES) {
      onError('Choose photos smaller than 20 MB altogether.');
      return;
    }
    onError('');
    onChange(next);
  }

  function openMenu() {
    Alert.alert(label, 'Add a clear photo from your camera or photo library.', [
      { text: 'Take photo', onPress: () => void choose('camera') },
      { text: 'Choose photos', onPress: () => void choose('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.copy}>
          <AppText variant="bodyMedium">{label}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {helper}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          {existingCount + images.length}/5
        </AppText>
      </View>
      <View style={styles.grid}>
        {images.map((image, index) => (
          <View key={image.uri} style={styles.previewShell}>
            <Image source={{ uri: image.uri }} style={styles.preview} />
            <Pressable
              accessibilityLabel={`Remove photo ${index + 1}`}
              onPress={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))}
              style={[styles.remove, { backgroundColor: colors.danger }]}
            >
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {remaining > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add photos for ${label}`}
            onPress={openMenu}
            style={[styles.add, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          >
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
            <AppText variant="caption" color={colors.primary}>
              Add
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  copy: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  previewShell: { width: 78, height: 78 },
  preview: { width: '100%', height: '100%', borderRadius: radius.md },
  remove: {
    position: 'absolute',
    right: -5,
    top: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
