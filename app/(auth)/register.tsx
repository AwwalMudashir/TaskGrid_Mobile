import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthArtwork } from '@/src/components/ui/AuthArtwork';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import { NoticeCard } from '@/src/components/ui/NoticeCard';
import { Screen } from '@/src/components/ui/Screen';
import { StepProgress } from '@/src/components/ui/StepProgress';
import { TextField } from '@/src/components/ui/TextField';
import { AdditionalSkillPicker } from '@/src/features/auth/AdditionalSkillPicker';
import type {
  AccountType,
  LocalProfileImage,
  RegistrationDraft,
  Skill,
} from '@/src/features/auth/types';
import { markFeatureTourPending } from '@/src/features/onboarding/feature-tour-storage';
import { ApiError, authApi, mediaApi, skillsApi } from '@/src/lib/api';
import { isEmail, isPhone, normaliseNigerianPhone, passwordError } from '@/src/lib/validation';
import { radius, spacing, useAppTheme } from '@/src/theme';

const initialDraft: RegistrationDraft = {
  accountType: 'CLIENT',
  primarySkillId: '',
  additionalSkillIds: [],
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
};

const stepCopy = [
  ['How will you use TaskGrid?', 'Choose the account that best fits what you want to do.'],
  ['Tell us about you', 'Your basic details help us create and protect your account.'],
  ['Secure your account', 'Create a strong password to finish your registration.'],
] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [profileImage, setProfileImage] = useState<LocalProfileImage | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [showAdditionalSkills, setShowAdditionalSkills] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setSkillsLoading(true);
    skillsApi
      .list()
      .then((items) => {
        if (active) setSkills(items);
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof ApiError ? cause.message : 'Could not load the skill list.');
      })
      .finally(() => {
        if (active) setSkillsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasRegistrationProgress =
    step > 0 ||
    draft.accountType !== initialDraft.accountType ||
    draft.primarySkillId.length > 0 ||
    draft.additionalSkillIds.length > 0 ||
    profileImage !== null ||
    draft.fullName.trim().length > 0 ||
    draft.email.trim().length > 0 ||
    draft.phoneNumber.trim().length > 0 ||
    draft.password.length > 0 ||
    draft.confirmPassword.length > 0 ||
    draft.acceptedTerms;

  const update = <Key extends keyof RegistrationDraft>(key: Key, value: RegistrationDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function validateCurrentStep() {
    if (step === 1) {
      if (draft.fullName.trim().length < 2) return 'Enter your full name.';
      if (!isEmail(draft.email)) return 'Enter a valid email address.';
      if (!isPhone(draft.phoneNumber)) return 'Enter a valid phone number with 10 to 15 digits.';
      if (draft.accountType === 'WORKER' && !draft.primarySkillId)
        return 'Choose your primary skill.';
    }
    if (step === 2) {
      const issue = passwordError(draft.password);
      if (issue) return issue;
      if (draft.password !== draft.confirmPassword) return 'The passwords do not match.';
      if (!draft.acceptedTerms) return 'Accept the Terms and Privacy Policy to continue.';
    }
    return '';
  }

  function next() {
    const issue = validateCurrentStep();
    setError(issue);
    if (!issue) setStep((value) => Math.min(value + 1, 2));
  }

  async function submit() {
    const issue = validateCurrentStep();
    setError(issue);
    if (issue) return;
    setLoading(true);
    try {
      const uploadedImage = profileImage
        ? await mediaApi.uploadProfileImage(profileImage)
        : undefined;
      await authApi.register(draft.accountType, {
        fullName: draft.fullName.trim(),
        email: draft.email.trim().toLowerCase(),
        phoneNumber: normaliseNigerianPhone(draft.phoneNumber),
        password: draft.password,
        primarySkillId: draft.accountType === 'WORKER' ? draft.primarySkillId : undefined,
        additionalSkillIds: draft.accountType === 'WORKER' ? draft.additionalSkillIds : undefined,
        profilePictureUrl: uploadedImage?.url,
        profilePicturePublicId: uploadedImage?.publicId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await markFeatureTourPending(draft.email).catch(() => undefined);
      router.replace({
        pathname: '/(auth)/check-email',
        params: { email: draft.email.trim().toLowerCase() },
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not create your account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function chooseAccount(accountType: AccountType) {
    setDraft((current) => ({
      ...current,
      accountType,
      primarySkillId: accountType === 'WORKER' ? current.primarySkillId : '',
      additionalSkillIds: accountType === 'WORKER' ? current.additionalSkillIds : [],
    }));
    Haptics.selectionAsync().catch(() => undefined);
  }

  async function selectProfileImage(source: 'camera' | 'library') {
    setShowPhotoMenu(false);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Allow camera access to take a profile photo.'
          : 'Allow photo access to choose a profile picture.',
      );
      return;
    }

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
    if (result.canceled) return;

    const asset = result.assets[0];
    setProfileImage({
      uri: asset.uri,
      fileName: asset.fileName ?? `profile-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSize: asset.fileSize,
    });
    setError('');
  }

  const selectedSkill = skills.find((skill) => skill.id === draft.primarySkillId);

  function requestExit() {
    if (hasRegistrationProgress) {
      setShowDiscardConfirmation(true);
      return;
    }
    router.back();
  }

  return (
    <Screen keyboard contentStyle={styles.screen}>
      <AuthHeader
        title="Create account"
        subtitle={`Step ${step + 1} of 3`}
        onBackPress={requestExit}
      />
      <StepProgress current={step + 1} total={3} />
      <AnimatedEntrance key={step} style={styles.content}>
        {step === 0 ? <AuthArtwork name="registration" width={124} height={124} /> : null}
        <View style={[styles.titleBlock, step === 0 && styles.centerBlock]}>
          <AppText variant="title" style={step === 0 ? styles.centerText : undefined}>
            {stepCopy[step][0]}
          </AppText>
          <AppText color={colors.textSecondary} style={step === 0 ? styles.centerText : undefined}>
            {stepCopy[step][1]}
          </AppText>
        </View>
        {error ? (
          <NoticeCard tone="danger" icon="alert-circle-outline">
            {error}
          </NoticeCard>
        ) : null}

        {step === 0 ? (
          <View style={styles.options}>
            <RoleCard
              selected={draft.accountType === 'CLIENT'}
              icon="briefcase-outline"
              title="I need help"
              description="Post tasks and hire trusted local workers."
              onPress={() => chooseAccount('CLIENT')}
            />
            <RoleCard
              selected={draft.accountType === 'WORKER'}
              icon="construct-outline"
              title="I want to work"
              description="Find nearby jobs that match your skills."
              onPress={() => chooseAccount('WORKER')}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.fields}>
            <View style={styles.photoBlock}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add a profile picture"
                onPress={() => setShowPhotoMenu(true)}
                style={({ pressed }) => [styles.photoButton, { opacity: pressed ? 0.8 : 1 }]}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.photoPlaceholder, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="person-outline" size={42} color={colors.primary} />
                  </View>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={17} color={colors.textOnPrimary} />
                </View>
              </Pressable>
              <AppText variant="bodyMedium">Add a profile picture</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                (Optional) You can add or change it later.
              </AppText>
            </View>
            <TextField
              label="Full name"
              placeholder="Your legal name"
              value={draft.fullName}
              onChangeText={(v) => update('fullName', v)}
              autoComplete="name"
            />
            <TextField
              label="Email address"
              placeholder="you@gmail.com"
              value={draft.email}
              onChangeText={(v) => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextField
              label="Phone number"
              placeholder="080 1234 5678"
              countryCode="+234"
              value={draft.phoneNumber}
              onChangeText={(v) => update('phoneNumber', v)}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            {draft.accountType === 'WORKER' ? (
              <>
                <View style={styles.selectorBlock}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Primary skill / category
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose primary skill"
                    onPress={() => !skillsLoading && setShowSkillMenu(true)}
                    style={({ pressed }) => [
                      styles.selector,
                      {
                        backgroundColor: colors.surface,
                        borderColor: draft.primarySkillId ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.selectorIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons
                        name={
                          (selectedSkill?.iconName as keyof typeof Ionicons.glyphMap) ??
                          'construct-outline'
                        }
                        size={19}
                        color={colors.primary}
                      />
                    </View>
                    <AppText
                      style={styles.selectorText}
                      color={selectedSkill ? colors.text : colors.textMuted}
                    >
                      {skillsLoading
                        ? 'Loading skills…'
                        : (selectedSkill?.name ?? 'Select a skill')}
                    </AppText>
                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                <AdditionalSkillPicker
                  visible={showAdditionalSkills}
                  skills={skills}
                  primarySkillId={draft.primarySkillId}
                  selectedIds={draft.additionalSkillIds}
                  onOpen={() => setShowAdditionalSkills(true)}
                  onClose={() => setShowAdditionalSkills(false)}
                  onChange={(ids) => update('additionalSkillIds', ids)}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.fields}>
            <TextField
              label="Password"
              placeholder="At least 8 characters"
              value={draft.password}
              onChangeText={(v) => update('password', v)}
              secureTextEntry
              autoComplete="new-password"
            />
            <TextField
              label="Confirm password"
              placeholder="Enter it again"
              value={draft.confirmPassword}
              onChangeText={(v) => update('confirmPassword', v)}
              secureTextEntry
              autoComplete="new-password"
            />
            <AppText variant="caption" color={colors.textMuted} style={styles.fieldHint}>
              Use 8+ characters with uppercase, lowercase and a number.
            </AppText>
            <View style={styles.terms}>
              <Switch
                value={draft.acceptedTerms}
                onValueChange={(v) => update('acceptedTerms', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
              <AppText color={colors.textSecondary} style={styles.termsText}>
                I agree to the Terms of Service and{' '}
                <AppText
                  accessibilityRole="link"
                  onPress={() => router.push('/(auth)/privacy-policy')}
                  color={colors.primary}
                  style={styles.policyLink}
                >
                  Privacy Policy
                </AppText>
                .
              </AppText>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous registration step"
              onPress={() => {
                setError('');
                setStep((value) => value - 1);
                Haptics.selectionAsync().catch(() => undefined);
              }}
              style={({ pressed }) => [
                styles.backAction,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.78 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.brandDark} />
            </Pressable>
          ) : null}
          <View style={styles.primaryAction}>
            <Button
              label={step === 2 ? 'Create account' : 'Continue'}
              onPress={step === 2 ? submit : next}
              loading={loading}
            />
          </View>
        </View>
      </AnimatedEntrance>
      <ConfirmationModal
        visible={showDiscardConfirmation}
        title="Discard your progress?"
        message="If you leave now, the account details you've entered will be lost."
        confirmLabel="Discard"
        onCancel={() => setShowDiscardConfirmation(false)}
        onConfirm={() => {
          setShowDiscardConfirmation(false);
          router.back();
        }}
      />
      <PhotoMenu
        visible={showPhotoMenu}
        hasPhoto={profileImage !== null}
        onClose={() => setShowPhotoMenu(false)}
        onCamera={() => selectProfileImage('camera')}
        onLibrary={() => selectProfileImage('library')}
        onRemove={() => {
          setProfileImage(null);
          setShowPhotoMenu(false);
        }}
      />
      <SkillMenu
        visible={showSkillMenu}
        skills={skills}
        selectedId={draft.primarySkillId}
        onClose={() => setShowSkillMenu(false)}
        onSelect={(skill) => {
          update('primarySkillId', skill.id);
          update(
            'additionalSkillIds',
            draft.additionalSkillIds.filter((id) => id !== skill.id),
          );
          setShowSkillMenu(false);
          setError('');
        }}
      />
    </Screen>
  );
}

function PhotoMenu({
  visible,
  hasPhoto,
  onClose,
  onCamera,
  onLibrary,
  onRemove,
}: {
  visible: boolean;
  hasPhoto: boolean;
  onClose(): void;
  onCamera(): void;
  onLibrary(): void;
  onRemove(): void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.menuSheet, { backgroundColor: colors.surface }]}
          onPress={() => undefined}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <AppText variant="subtitle">Profile picture</AppText>
          <AppText color={colors.textSecondary}>Choose how you want to add your photo.</AppText>
          <MenuOption icon="camera-outline" label="Take a photo" onPress={onCamera} />
          <MenuOption icon="images-outline" label="Choose from photos" onPress={onLibrary} />
          {hasPhoto ? (
            <MenuOption icon="trash-outline" label="Remove photo" danger onPress={onRemove} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SkillMenu({
  visible,
  skills,
  selectedId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  skills: Skill[];
  selectedId: string;
  onClose(): void;
  onSelect(skill: Skill): void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.menuSheet, styles.skillSheet, { backgroundColor: colors.surface }]}
          onPress={() => undefined}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <AppText variant="subtitle">Choose your primary skill</AppText>
          <AppText color={colors.textSecondary}>Pick the service you are strongest at.</AppText>
          <ScrollView
            style={styles.skillList}
            contentContainerStyle={styles.skillListContent}
            showsVerticalScrollIndicator={false}
          >
            {skills.map((skill) => (
              <Pressable
                key={skill.id}
                onPress={() => onSelect(skill)}
                style={({ pressed }) => [
                  styles.skillOption,
                  {
                    backgroundColor:
                      selectedId === skill.id ? colors.primarySoft : colors.surfaceSecondary,
                    borderColor: selectedId === skill.id ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={(skill.iconName as keyof typeof Ionicons.glyphMap) ?? 'construct-outline'}
                  size={19}
                  color={colors.primary}
                />
                <AppText variant="bodyMedium" style={styles.selectorText}>
                  {skill.name}
                </AppText>
                {selectedId === skill.id ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuOption({
  icon,
  label,
  danger = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress(): void;
}) {
  const { colors } = useAppTheme();
  const tint = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuOption,
        { backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <AppText variant="bodyMedium" color={tint}>
        {label}
      </AppText>
    </Pressable>
  );
}

type RoleCardProps = {
  selected: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress(): void;
};

function RoleCard({ selected, icon, title, description, onPress }: RoleCardProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.roleIcon,
          { backgroundColor: selected ? colors.primary : colors.surfaceSecondary },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selected ? colors.textOnPrimary : colors.textSecondary}
        />
      </View>
      <View style={styles.roleCopy}>
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {description}
        </AppText>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={selected ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm },
  content: { flex: 1, paddingTop: spacing.xl, gap: spacing.xl },
  titleBlock: { gap: spacing.sm },
  centerBlock: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  options: { gap: spacing.sm },
  fields: { gap: spacing.lg },
  fieldHint: { marginTop: -spacing.md, paddingHorizontal: spacing.xs },
  photoBlock: { alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  photoButton: { width: 96, height: 96, marginBottom: spacing.sm },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: { width: 96, height: 96, borderRadius: radius.pill },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  selectorBlock: { gap: spacing.sm },
  selector: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  selectorIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: { flex: 1 },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCopy: { flex: 1, gap: 1 },
  terms: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  termsText: { flex: 1 },
  policyLink: { textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: 'auto', paddingTop: spacing.xl },
  backAction: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 24, 0.62)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  menuSheet: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  skillSheet: { maxHeight: '84%' },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  menuOption: {
    minHeight: 54,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  skillList: { marginTop: spacing.sm },
  skillListContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  skillOption: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
