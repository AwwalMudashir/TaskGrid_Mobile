import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { AdditionalSkillPicker } from '@/src/features/auth/AdditionalSkillPicker';
import type { LocalProfileImage, Skill } from '@/src/features/auth/types';
import { useAuth } from '@/src/features/auth/AuthContext';
import { ApiError, skillsApi } from '@/src/lib/api';
import { isPhone, normaliseNigerianPhone } from '@/src/lib/validation';
import { radius, spacing, useAppTheme } from '@/src/theme';

export default function PersonalInfoScreen() {
  const { colors } = useAppTheme();
  const { user, updateProfile, removeProfilePicture } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phoneNumber?.replace(/^\+234/, '') ?? '');
  const [skillId, setSkillId] = useState(user?.primarySkillId ?? '');
  const [additionalSkillIds, setAdditionalSkillIds] = useState(
    user?.additionalSkills?.map((skill) => skill.id) ?? [],
  );
  const [skills, setSkills] = useState<Skill[]>([]);
  const [picture, setPicture] = useState<LocalProfileImage | null>(null);
  const [skillMenu, setSkillMenu] = useState(false);
  const [additionalSkillMenu, setAdditionalSkillMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isWorker = user?.role === 'RUNNER';

  useEffect(() => {
    if (isWorker)
      skillsApi
        .list()
        .then(setSkills)
        .catch(() => setError('Skills could not be loaded.'));
  }, [isWorker]);

  async function choosePicture(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(
        'Permission required',
        `Allow TaskGrid to access your ${source === 'camera' ? 'camera' : 'photos'} first.`,
      );
    const result = await (source === 'camera'
      ? ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        }));
    if (!result.canceled) {
      const asset = result.assets[0];
      setPicture({
        uri: asset.uri,
        fileName: asset.fileName ?? `profile-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileSize: asset.fileSize,
      });
    }
  }

  function openPictureMenu() {
    Alert.alert('Update profile picture', 'Choose where the new photo should come from.', [
      { text: 'Take photo', onPress: () => choosePicture('camera') },
      { text: 'Choose from photos', onPress: () => choosePicture('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function save() {
    const name = fullName.trim();
    if (name.length < 2) return setError('Enter your full name.');
    if (!isPhone(phone)) return setError('Enter a valid phone number.');
    if (isWorker && !skillId) return setError('Choose your primary skill.');
    if (picture?.fileSize && picture.fileSize > 5 * 1024 * 1024)
      return setError('That photo is larger than 5 MB. Choose a smaller image and try again.');
    setLoading(true);
    setError('');
    try {
      await updateProfile(
        {
          fullName: name,
          phoneNumber: normaliseNigerianPhone(phone),
          ...(isWorker ? { primarySkillId: skillId, additionalSkillIds } : {}),
        },
        picture,
      );
      setPicture(null);
      Alert.alert('Account updated', 'Your profile changes have been saved.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Your account could not be updated.');
    } finally {
      setLoading(false);
    }
  }

  function confirmRemovePicture() {
    Alert.alert('Remove profile picture?', 'Your name initial will be shown instead.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          setError('');
          try {
            await removeProfilePicture();
            setPicture(null);
          } catch (cause) {
            setError(
              cause instanceof ApiError ? cause.message : 'The picture could not be removed.',
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  const selectedSkill =
    skills.find((skill) => skill.id === skillId)?.name ??
    user?.primarySkillName ??
    'Choose a skill';
  const previewUri = picture?.uri ?? user?.profilePictureUrl;
  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader title="Update account" subtitle="Keep your public information accurate" />
      <View style={styles.photoSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile picture"
          onPress={openPictureMenu}
          style={[
            styles.avatar,
            { backgroundColor: colors.primarySoft, borderColor: colors.border },
          ]}
        >
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.image} />
          ) : (
            <AppText variant="display" color={colors.primary}>
              {fullName.trim().charAt(0).toUpperCase() || '?'}
            </AppText>
          )}
          <View style={[styles.camera, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera" size={17} color={colors.textOnPrimary} />
          </View>
        </Pressable>
        <View style={styles.photoActions}>
          <Pressable onPress={openPictureMenu}>
            <AppText variant="bodyMedium" color={colors.primary}>
              {previewUri ? 'Change picture' : 'Add picture'}
            </AppText>
          </Pressable>
          {user?.profilePictureUrl ? (
            <Pressable onPress={confirmRemovePicture}>
              <AppText variant="caption" color={colors.danger}>
                Remove current picture
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
      {error ? (
        <NoticeCard tone="danger" icon="alert-circle-outline">
          {error}
        </NoticeCard>
      ) : null}
      <View style={styles.form}>
        <TextField
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />
        <TextField
          label="Phone number"
          countryCode="+234"
          placeholder="Enter phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextField label="Email address" value={user?.email ?? ''} editable={false} />
        {isWorker ? (
          <>
            <View style={styles.field}>
              <AppText variant="caption">Primary skill</AppText>
              <Pressable
                onPress={() => setSkillMenu(true)}
                style={[
                  styles.select,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <AppText color={skillId ? colors.text : colors.textMuted}>{selectedSkill}</AppText>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            <AdditionalSkillPicker
              visible={additionalSkillMenu}
              skills={skills}
              primarySkillId={skillId}
              selectedIds={additionalSkillIds}
              onOpen={() => setAdditionalSkillMenu(true)}
              onClose={() => setAdditionalSkillMenu(false)}
              onChange={setAdditionalSkillIds}
            />
          </>
        ) : null}
      </View>
      <NoticeCard icon="information-circle-outline">
        Email address and account type require separate protected flows and cannot be changed here.
      </NoticeCard>
      <Button label="Save changes" onPress={save} loading={loading} />
      <Modal
        visible={skillMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setSkillMenu(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setSkillMenu(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHeader}>
              <AppText variant="subtitle">Primary skill</AppText>
              <Pressable onPress={() => setSkillMenu(false)}>
                <Ionicons name="close" size={23} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              {skills.map((skill) => (
                <Pressable
                  key={skill.id}
                  onPress={() => {
                    setSkillId(skill.id);
                    setAdditionalSkillIds((current) =>
                      current.filter((additionalId) => additionalId !== skill.id),
                    );
                    setSkillMenu(false);
                  }}
                  style={[styles.skillRow, { borderBottomColor: colors.divider }]}
                >
                  <AppText variant="bodyMedium">{skill.name}</AppText>
                  {skill.id === skillId ? (
                    <Ionicons name="checkmark-circle" size={21} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.sm },
  photoSection: { alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%', borderRadius: 52 },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: { alignItems: 'center', gap: spacing.xs },
  form: { gap: spacing.lg },
  field: { gap: 6 },
  select: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(5,10,24,0.58)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '62%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  skillRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
