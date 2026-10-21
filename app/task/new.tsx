import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { MoneyField } from '@/src/components/ui/MoneyField';
import { Screen } from '@/src/components/ui/Screen';
import { SkeletonBlock } from '@/src/components/ui/SkeletonLoader';
import { TextField } from '@/src/components/ui/TextField';
import type { LocalProfileImage, Skill } from '@/src/features/auth/types';
import { TaskPhotoPicker } from '@/src/features/tasks/TaskPhotoPicker';
import { VoiceTaskAssistant } from '@/src/features/tasks/VoiceTaskAssistant';
import {
  emergencyContactApi,
  taskApi,
  type Coordinates,
  type EmergencyContact,
  type TaskAssistantDraft,
  type TaskPriceSuggestion,
} from '@/src/features/tasks/task-api';
import { ApiError, skillsApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

export default function NewTaskScreen() {
  const router = useRouter();
  const { assistant } = useLocalSearchParams<{ assistant?: string }>();
  const openedFromLink = useRef(false);
  const { colors } = useAppTheme();
  const [contact, setContact] = useState<EmergencyContact | null>(null);
  const [contactState, setContactState] = useState<'checking' | 'present' | 'missing' | 'error'>(
    'checking',
  );
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillId, setSkillId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<LocalProfileImage[]>([]);
  const [area, setArea] = useState('');
  const [detectedArea, setDetectedArea] = useState('');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH'>('NORMAL');
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState<TaskAssistantDraft | null>(null);
  const [priceGuide, setPriceGuide] = useState<TaskPriceSuggestion | null>(null);
  const [pricing, setPricing] = useState(false);

  useEffect(() => {
    if (assistant === 'open' && !openedFromLink.current) {
      openedFromLink.current = true;
      setAssistantOpen(true);
    }
  }, [assistant]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setContactState('checking');
      void Promise.all([emergencyContactApi.current(), skillsApi.list()])
        .then(([saved, available]) => {
          if (active) {
            setContact(saved);
            setContactState(saved ? 'present' : 'missing');
            setSkills(available);
          }
        })
        .catch((cause) => {
          if (active) {
            setContactState('error');
            setError(
              cause instanceof ApiError
                ? cause.message
                : "We couldn't prepare this form. Try again.",
            );
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function getLocation() {
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Allow location access to post a task at your current location.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPosition({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      });
      setPriceGuide(null);
      const addresses = await Location.reverseGeocodeAsync(result.coords).catch(() => []);
      const address = addresses[0];
      setDetectedArea(
        address ? [address.district, address.city, address.region].filter(Boolean).join(', ') : '',
      );
    } catch {
      setError("We couldn't find your location. Check your location settings and try again.");
    } finally {
      setLocating(false);
    }
  }

  const selectedSkill = skills.find((skill) => skill.id === skillId);
  const parsedBudget = Number(budget);
  const validBudget = /^\d+(?:\.\d{1,2})?$/.test(budget.trim()) && parsedBudget > 0;
  const canPost = Boolean(
    title.trim() && description.trim() && skillId && position && contact && validBudget,
  );

  async function post() {
    if (!canPost || !position || posting) return;
    setPosting(true);
    setError('');
    try {
      const task = await taskApi.post({
        title: title.trim(),
        description: description.trim(),
        skillId,
        locationDescription: area.trim() || detectedArea || 'Location pinned on map',
        ...position,
        budget: parsedBudget,
        urgencyLevel: urgency,
        ...(assistantDraft ? { assistantAuditId: assistantDraft.auditId } : {}),
      });
      let photoUploadFailed = false;
      for (const photo of photos) {
        try {
          await taskApi.uploadBriefImage(task.id, photo);
        } catch {
          photoUploadFailed = true;
          break;
        }
      }
      router.replace({
        pathname: '/task/[id]',
        params: {
          id: task.id,
          ...(photoUploadFailed ? { photoUploadFailed: 'true' } : {}),
        },
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "We couldn't post your task. Try again.",
      );
    } finally {
      setPosting(false);
    }
  }

  function useAssistantDraft(
    draft: TaskAssistantDraft,
    selectedLocation: { coordinates: Coordinates; description: string } | null,
  ) {
    setAssistantDraft(draft);
    setTitle(draft.title ?? '');
    setDescription(draft.description ?? '');
    setSkillId(draft.skillId ?? '');
    if (selectedLocation) {
      setPosition(selectedLocation.coordinates);
      setDetectedArea(selectedLocation.description);
      setArea(selectedLocation.description);
    } else if (draft.locationDescription && !area.trim()) {
      setArea(draft.locationDescription);
    }
    setBudget(String(draft.budget));
    setPriceGuide({
      minimum: draft.suggestedPriceMin,
      maximum: draft.suggestedPriceMax,
      midpoint: draft.budget,
      explanation: draft.priceExplanation,
      historicalSampleSize: 0,
    });
    setUrgency(draft.urgencyLevel === 'HIGH' ? 'HIGH' : 'NORMAL');
    setAssistantOpen(false);
    setError('');
  }

  async function suggestPrice() {
    if (!skillId || description.trim().length < 10 || pricing) return;
    setPricing(true);
    setError('');
    try {
      const suggestion = await taskApi.priceSuggestion({
        skillId,
        description: description.trim(),
        urgencyLevel: urgency,
        ...(position ?? {}),
      });
      setPriceGuide(suggestion);
      if (!budget.trim()) setBudget(String(suggestion.midpoint));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't prepare a price range. You can still enter your own budget.",
      );
    } finally {
      setPricing(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen} keyboard>
      <AuthHeader
        title="Create a task"
        subtitle="Share the essentials, then compare worker offers."
      />
      {contactState === 'missing' ? (
        <AnimatedEntrance>
          <View style={[styles.safetyNotice, { backgroundColor: colors.warningSoft }]}>
            <View style={styles.safetyCopy}>
              <AppText variant="bodyMedium" color={colors.warning}>
                Add your emergency contact first
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                It is required before you can publish or accept a task.
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/emergency-contact')}
              style={styles.safetyAction}
            >
              <AppText variant="button" color={colors.warning}>
                Add now
              </AppText>
              <Ionicons name="arrow-forward" size={17} color={colors.warning} />
            </Pressable>
          </View>
        </AnimatedEntrance>
      ) : null}

      <AnimatedEntrance delay={30}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAssistantOpen(true)}
          style={({ pressed }) => [
            styles.voiceInvite,
            {
              backgroundColor: colors.primarySoft,
              opacity: pressed ? 0.84 : 1,
            },
          ]}
        >
          <View style={styles.voiceInviteCopy}>
            <AppText variant="eyebrow" color={colors.primary}>
              SPEAK OR TYPE
            </AppText>
            <AppText variant="subtitle">Describe it in your own words</AppText>
            <AppText color={colors.textSecondary}>
              TaskGrid can shape your note into an editable task draft.
            </AppText>
          </View>
          <View style={[styles.voiceInviteAction, { backgroundColor: colors.primary }]}>
            <Ionicons name="mic" size={23} color="#FFFFFF" />
          </View>
        </Pressable>
      </AnimatedEntrance>

      {assistantDraft ? (
        <AnimatedEntrance style={styles.draftStrip}>
          <View style={styles.draftStripTop}>
            <View>
              <AppText variant="eyebrow" color={colors.accent}>
                ASSISTED DRAFT
              </AppText>
              <AppText variant="bodyMedium">Review and edit every field below</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAssistantOpen(true)}
              hitSlop={10}
            >
              <AppText variant="button" color={colors.primary}>
                Redo
              </AppText>
            </Pressable>
          </View>
          <View style={[styles.draftRule, { backgroundColor: colors.divider }]} />
          <AppText variant="caption" color={colors.textSecondary}>
            Suggested range ₦{Number(assistantDraft.suggestedPriceMin).toLocaleString('en-NG')} – ₦
            {Number(assistantDraft.suggestedPriceMax).toLocaleString('en-NG')}.{' '}
            {assistantDraft.priceExplanation}
          </AppText>
        </AnimatedEntrance>
      ) : null}

      <AnimatedEntrance delay={40} style={styles.intro}>
        <AppText variant="eyebrow" color={colors.primary}>
          New request
        </AppText>
        <AppText variant="title">What do you need help with?</AppText>
        <AppText color={colors.textSecondary}>
          A clear brief helps the right workers understand the job and send useful offers.
        </AppText>
      </AnimatedEntrance>

      <AnimatedEntrance delay={90} style={styles.section}>
        <SectionHeading
          title="The job"
          description="Describe the result you want, not just the problem."
        />
        <TextField
          label="Short title"
          placeholder="Fix a leaking kitchen tap"
          value={title}
          onChangeText={setTitle}
          maxLength={180}
        />
        <AppText variant="caption" color={colors.textMuted} style={styles.characterCount}>
          {title.length}/180
        </AppText>
        <TextField
          label="Task details"
          placeholder="What is happening, what needs to be done, and anything the worker should bring?"
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            setPriceGuide(null);
          }}
          multiline
          maxLength={4000}
          style={styles.description}
          textAlignVertical="top"
        />
        <AppText variant="caption" color={colors.textMuted} style={styles.characterCount}>
          {description.length}/4000
        </AppText>
        <TaskPhotoPicker
          label="Show workers what you mean"
          helper="Optional. Add up to 5 clear photos, no more than 20 MB altogether."
          images={photos}
          onChange={setPhotos}
          onError={setError}
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <View style={styles.categoryField}>
          <View style={styles.categoryLabel}>
            <AppText variant="bodyMedium">Service category</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              This decides which workers can discover the task.
            </AppText>
          </View>
          {contactState === 'checking' ? (
            <SkeletonBlock height={54} borderRadius={radius.md} />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerOpen(true)}
              style={[
                styles.selector,
                {
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            >
              <View style={styles.selectorCopy}>
                <AppText
                  variant={selectedSkill ? 'bodyMedium' : 'body'}
                  color={selectedSkill ? colors.text : colors.textMuted}
                >
                  {selectedSkill?.name ?? 'Choose the closest match'}
                </AppText>
                {selectedSkill ? (
                  <AppText variant="caption" color={colors.primary}>
                    Selected
                  </AppText>
                ) : null}
              </View>
              <View style={[styles.selectorArrow, { backgroundColor: colors.surface }]}>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </View>
            </Pressable>
          )}
        </View>
      </AnimatedEntrance>

      <View style={[styles.sectionRule, { backgroundColor: colors.divider }]} />

      <AnimatedEntrance delay={140} style={styles.section}>
        <SectionHeading
          title="Where it is"
          description="Pin the job accurately. Exact coordinates stay private until you accept a worker."
        />
        <View
          style={[
            styles.locationPanel,
            {
              backgroundColor: position ? colors.successSoft : colors.primarySoft,
            },
          ]}
        >
          <View
            style={[
              styles.locationMarker,
              {
                backgroundColor: position ? colors.success : colors.primary,
              },
            ]}
          >
            <Ionicons name={position ? 'checkmark' : 'location'} size={22} color="#FFFFFF" />
          </View>
          <View style={styles.locationCopy}>
            <AppText variant="bodyMedium">
              {position ? 'Location pinned' : 'Pin the task location'}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {position
                ? detectedArea || 'Current coordinates saved'
                : "Use this device's current location"}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={position ? 'Update current location' : 'Use current location'}
            disabled={locating}
            onPress={getLocation}
            style={({ pressed }) => [
              styles.locationAction,
              {
                backgroundColor: colors.surface,
                opacity: locating ? 0.55 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText variant="button" color={position ? colors.success : colors.primary}>
              {locating ? 'Finding…' : position ? 'Update' : 'Use'}
            </AppText>
          </Pressable>
        </View>
        <TextField
          label="Helpful area note (optional)"
          placeholder="Yaba, Lagos or a nearby landmark"
          value={area}
          onChangeText={setArea}
          maxLength={500}
        />
      </AnimatedEntrance>

      <View style={[styles.sectionRule, { backgroundColor: colors.divider }]} />

      <AnimatedEntrance delay={190} style={styles.section}>
        <SectionHeading
          title="Budget and timing"
          description="Set a starting budget. Workers can still send their own offers."
        />
        <Pressable
          accessibilityRole="button"
          disabled={!skillId || description.trim().length < 10 || pricing}
          onPress={() => void suggestPrice()}
          style={({ pressed }) => [
            styles.estimateAction,
            { opacity: !skillId || description.trim().length < 10 ? 0.45 : pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.estimateTitle}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            <AppText variant="bodyMedium" color={colors.primary}>
              {pricing ? 'Working out a range…' : 'Suggest a fair starting range'}
            </AppText>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </Pressable>
        {priceGuide ? (
          <View style={[styles.priceRange, { borderColor: colors.divider }]}>
            <AppText variant="eyebrow" color={colors.textMuted}>
              GUIDE, NOT A FIXED PRICE
            </AppText>
            <AppText variant="title">
              ₦{Number(priceGuide.minimum).toLocaleString('en-NG')} – ₦
              {Number(priceGuide.maximum).toLocaleString('en-NG')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {priceGuide.explanation}
            </AppText>
          </View>
        ) : null}
        <MoneyField label="Budget" value={budget} onChangeText={setBudget} />
        {assistantDraft && !priceGuide ? (
          <View style={styles.priceGuide}>
            <AppText variant="caption" color={colors.primary}>
              Suggested ₦{Number(assistantDraft.suggestedPriceMin).toLocaleString('en-NG')} – ₦
              {Number(assistantDraft.suggestedPriceMax).toLocaleString('en-NG')}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Your budget stays editable.
            </AppText>
          </View>
        ) : null}
        <View style={styles.priorityField}>
          <AppText variant="bodyMedium">When do you need it?</AppText>
          <View style={styles.priorityRow}>
            {(['NORMAL', 'HIGH'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: urgency === value }}
                onPress={() => {
                  setUrgency(value);
                  setPriceGuide(null);
                }}
                style={[
                  styles.priority,
                  {
                    backgroundColor:
                      urgency === value ? colors.primarySoft : colors.surfaceSecondary,
                  },
                ]}
              >
                <AppText
                  variant="bodyMedium"
                  color={urgency === value ? colors.primary : colors.textSecondary}
                >
                  {value === 'NORMAL' ? 'Flexible' : 'Soon'}
                </AppText>
                <AppText
                  variant="caption"
                  color={urgency === value ? colors.primary : colors.textMuted}
                  style={styles.priorityDescription}
                >
                  {value === 'NORMAL'
                    ? 'Arrange timing with the worker'
                    : 'Prefer a quicker response'}
                </AppText>
                <View
                  style={[
                    styles.choiceDot,
                    {
                      borderColor: urgency === value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {urgency === value ? (
                    <View style={[styles.choiceDotFill, { backgroundColor: colors.primary }]} />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            “Soon” signals preference only. It does not guarantee immediate matching.
          </AppText>
        </View>
      </AnimatedEntrance>

      {error ? (
        <View style={styles.errorLine}>
          <View style={[styles.errorDot, { backgroundColor: colors.danger }]} />
          <AppText color={colors.danger} style={styles.errorCopy}>
            {error}
          </AppText>
        </View>
      ) : null}

      <AnimatedEntrance delay={230} style={styles.submitArea}>
        <Button
          label="Publish task"
          icon="arrow-forward"
          onPress={post}
          disabled={!canPost}
          loading={posting}
        />
        <AppText variant="caption" color={colors.textMuted} style={styles.submitNote}>
          Nothing is assigned yet. You will review offers before choosing a worker.
        </AppText>
      </AnimatedEntrance>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View style={[styles.picker, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.divider }]} />
            <View style={styles.pickerHeader}>
              <View style={styles.pickerHeadingCopy}>
                <AppText variant="subtitle">Choose a category</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  Pick the closest match for the work you need.
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close category picker"
                onPress={() => setPickerOpen(false)}
                style={[styles.pickerClose, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.skillList}
              contentContainerStyle={styles.skillGrid}
              showsVerticalScrollIndicator={false}
            >
              {skills.map((skill) => (
                <Pressable
                  key={skill.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: skill.id === skillId }}
                  onPress={() => {
                    setSkillId(skill.id);
                    setPriceGuide(null);
                    setPickerOpen(false);
                  }}
                  style={[
                    styles.skillChoice,
                    {
                      backgroundColor:
                        skill.id === skillId ? colors.primarySoft : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <AppText
                    variant="bodyMedium"
                    color={skill.id === skillId ? colors.primary : colors.text}
                  >
                    {skill.name}
                  </AppText>
                  {skill.id === skillId ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                      style={styles.skillSelected}
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <VoiceTaskAssistant
        visible={assistantOpen}
        skills={skills}
        coordinates={position}
        locationDescription={area.trim() || detectedArea}
        onClose={() => setAssistantOpen(false)}
        onUseDraft={useAssistantDraft}
      />
    </Screen>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeading}>
      <AppText variant="subtitle">{title}</AppText>
      <AppText color={colors.textSecondary}>{description}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  safetyCopy: { flex: 1, gap: 2 },
  safetyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  intro: { gap: spacing.sm, paddingRight: spacing.lg },
  voiceInvite: {
    minHeight: 138,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  voiceInviteCopy: { flex: 1, gap: spacing.xs },
  voiceInviteAction: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftStrip: { gap: spacing.md, paddingHorizontal: spacing.xs },
  draftStripTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  draftRule: { height: 1 },
  section: { gap: spacing.lg },
  sectionHeading: { gap: spacing.xs, paddingRight: spacing.md },
  sectionRule: { height: 1 },
  description: { minHeight: 132, paddingTop: spacing.lg },
  characterCount: { alignSelf: 'flex-end', marginTop: -spacing.md },
  divider: { height: 1, marginVertical: spacing.xs },
  categoryField: { gap: spacing.md },
  categoryLabel: { gap: 3 },
  selector: {
    minHeight: 68,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectorCopy: { flex: 1, gap: 3 },
  selectorArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPanel: {
    minHeight: 94,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  locationMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: { flex: 1, gap: 3 },
  locationAction: {
    minWidth: 68,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  priorityField: { gap: spacing.md },
  estimateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  estimateTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceRange: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  priceGuide: { gap: 2, marginTop: -spacing.sm, paddingHorizontal: 2 },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priority: {
    flex: 1,
    borderRadius: radius.md,
    minHeight: 118,
    padding: spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priorityDescription: { maxWidth: 120 },
  choiceDot: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceDotFill: { width: 9, height: 9, borderRadius: 5 },
  errorLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  errorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 8,
  },
  errorCopy: { flex: 1 },
  submitArea: { gap: spacing.md, paddingTop: spacing.sm },
  submitNote: { textAlign: 'center', paddingHorizontal: spacing.xl },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7,13,30,0.65)',
  },
  picker: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  pickerHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pickerHeadingCopy: { flex: 1, gap: 3 },
  pickerClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillList: { maxHeight: 430 },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  skillChoice: {
    width: '48%',
    minHeight: 76,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  skillSelected: { position: 'absolute', right: spacing.sm, top: spacing.sm },
});
