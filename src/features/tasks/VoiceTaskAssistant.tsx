import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { MoneyField } from '@/src/components/ui/MoneyField';
import { TextField } from '@/src/components/ui/TextField';
import type { Skill } from '@/src/features/auth/types';
import { taskApi, type Coordinates, type TaskAssistantDraft } from '@/src/features/tasks/task-api';
import { ApiError } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

type VoiceTaskAssistantProps = {
  visible: boolean;
  skills: Skill[];
  coordinates: Coordinates | null;
  locationDescription: string;
  onClose(): void;
  onUseDraft(
    draft: TaskAssistantDraft,
    selectedLocation: { coordinates: Coordinates; description: string } | null,
  ): void;
};

const WAVE_HEIGHTS = [22, 36, 52, 68, 47, 31, 20];

function skillIconName(skill: Skill | null | undefined): keyof typeof Ionicons.glyphMap {
  const icon = skill?.iconName;
  return icon && icon in Ionicons.glyphMap
    ? (icon as keyof typeof Ionicons.glyphMap)
    : 'construct-outline';
}

export function VoiceTaskAssistant({
  visible,
  skills,
  coordinates,
  locationDescription,
  onClose,
  onUseDraft,
}: VoiceTaskAssistantProps) {
  const { colors, isDark } = useAppTheme();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState<TaskAssistantDraft | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [taskLocation, setTaskLocation] = useState(locationDescription);
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates | null>(coordinates);
  const [budget, setBudget] = useState('');
  const [timing, setTiming] = useState<'NORMAL' | 'HIGH'>('NORMAL');
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const committedTranscript = useRef('');
  const transcriptRef = useRef('');
  const segmentBaseTranscript = useRef('');
  const keepListening = useRef(false);
  const visibleRef = useRef(visible);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const waveValues = useRef(WAVE_HEIGHTS.map(() => new Animated.Value(0.35))).current;

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    committedTranscript.current = transcriptRef.current.trim();
    if (keepListening.current && visibleRef.current) {
      clearRecognitionRestart();
      restartTimer.current = setTimeout(startRecognitionSegment, 250);
      return;
    }
    setListening(false);
  });
  useSpeechRecognitionEvent('result', (event) => {
    const heard = event.results[0]?.transcript?.trim();
    if (!heard) return;
    const combined = mergeTranscript(segmentBaseTranscript.current, heard);
    transcriptRef.current = combined;
    setTranscript(combined);
    if (event.isFinal) {
      committedTranscript.current = combined;
      segmentBaseTranscript.current = combined;
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    committedTranscript.current = transcriptRef.current.trim();
    if (event.error === 'aborted' || event.error === 'no-speech') return;

    keepListening.current = false;
    setListening(false);
    console.warn('[TaskGrid voice] Speech recognition failed', event.error, event.message);
    setError(speechRecognitionMessage(event.error));
  });

  function clearRecognitionRestart() {
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
  }

  function startRecognitionSegment() {
    clearRecognitionRestart();
    if (!keepListening.current || !visibleRef.current) return;

    segmentBaseTranscript.current = committedTranscript.current.trim();
    try {
      ExpoSpeechRecognitionModule.start({
        // en-GB is broadly supported by Android recognisers and handles Nigerian English well.
        lang: Platform.OS === 'android' ? 'en-GB' : 'en-NG',
        interimResults: true,
        // Android recognisers are more reliable in single segments. The end listener
        // immediately starts the next segment while the user still wants to dictate.
        continuous: false,
        maxAlternatives: 1,
        contextualStrings: ['TaskGrid', ...skills.slice(0, 20).map((skill) => skill.name)],
      });
    } catch (cause) {
      keepListening.current = false;
      setListening(false);
      console.warn('[TaskGrid voice] Could not start speech recognition', cause);
      setError('Voice input could not start. Check speech services and try again.');
    }
  }

  useEffect(() => {
    if (!listening) {
      pulse.stopAnimation();
      pulse.setValue(1);
      waveValues.forEach((value) => {
        value.stopAnimation();
        value.setValue(0.35);
      });
      return;
    }
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    const waveAnimation = Animated.loop(
      Animated.stagger(
        80,
        waveValues.map((value, index) =>
          Animated.sequence([
            Animated.timing(value, {
              toValue: index % 2 === 0 ? 1 : 0.78,
              duration: 300 + index * 35,
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: 0.3,
              duration: 360 + (WAVE_HEIGHTS.length - index) * 30,
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );
    pulseAnimation.start();
    waveAnimation.start();
    return () => {
      pulseAnimation.stop();
      waveAnimation.stop();
    };
  }, [listening, pulse, waveValues]);

  useEffect(() => {
    visibleRef.current = visible;
    if (!visible) {
      keepListening.current = false;
      clearRecognitionRestart();
    }
  }, [visible]);

  useEffect(
    () => () => {
      keepListening.current = false;
      clearRecognitionRestart();
      ExpoSpeechRecognitionModule.abort();
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedCoordinates(coordinates);
    if (locationDescription.trim()) setTaskLocation(locationDescription.trim());
  }, [coordinates, locationDescription, visible]);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [selectedSkillId, skills],
  );
  const validBudget = /^\d+(?:\.\d{1,2})?$/.test(budget.trim()) && Number(budget) > 0;
  const detailsReady = Boolean(
    title.trim().length >= 5 &&
    description.trim().length >= 10 &&
    selectedSkillId &&
    taskLocation.trim() &&
    selectedCoordinates &&
    validBudget,
  );

  async function toggleListening() {
    setError('');
    if (listening) {
      keepListening.current = false;
      clearRecognitionRestart();
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError('Voice input is unavailable. Enable Google speech recognition and try again.');
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Allow microphone and speech access to describe your task by voice.');
      return;
    }
    committedTranscript.current = transcript.trim();
    transcriptRef.current = transcript.trim();
    keepListening.current = true;
    setListening(true);
    startRecognitionSegment();
  }

  function editTranscript(value: string) {
    setTranscript(value);
    transcriptRef.current = value;
    committedTranscript.current = value.trim();
    segmentBaseTranscript.current = value.trim();
  }

  async function prepareDraft() {
    const note = transcript.trim();
    if (note.length < 12 || loading) {
      setError('Add a little more detail so we can prepare a useful task.');
      return;
    }
    keepListening.current = false;
    clearRecognitionRestart();
    ExpoSpeechRecognitionModule.stop();
    setLoading(true);
    setError('');
    try {
      const next = await taskApi.assistantDraft({
        transcript: note,
        ...(selectedCoordinates ?? coordinates ?? {}),
        ...(taskLocation.trim() || locationDescription.trim()
          ? { locationDescription: taskLocation.trim() || locationDescription.trim() }
          : {}),
      });
      if (draft?.auditId) {
        void taskApi.assistantDecision(draft.auditId, false).catch(() => undefined);
      }
      setDraft(next);
      setTitle(next.title ?? '');
      setDescription(next.description ?? '');
      setSelectedSkillId(next.skillId ?? '');
      setTaskLocation(next.locationDescription ?? taskLocation);
      setBudget(next.budget > 0 ? String(next.budget) : '');
      setTiming(next.urgencyLevel === 'HIGH' ? 'HIGH' : 'NORMAL');
      setCategoryOpen(false);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'We could not prepare the draft. Your text is still here, so you can try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentLocation() {
    if (locating) return;
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Allow location access to use your current task location.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoordinates = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setSelectedCoordinates(nextCoordinates);
      try {
        const places = await Location.reverseGeocodeAsync(nextCoordinates);
        const place = places[0];
        const readable = [place?.district, place?.subregion, place?.city, place?.region]
          .filter(Boolean)
          .filter((value, index, values) => values.indexOf(value) === index)
          .slice(0, 3)
          .join(', ');
        setTaskLocation(readable || 'Current location');
      } catch {
        setTaskLocation('Current location');
      }
    } catch {
      setError('We could not get your location. Check location services and try again.');
    } finally {
      setLocating(false);
    }
  }

  function close() {
    keepListening.current = false;
    clearRecognitionRestart();
    ExpoSpeechRecognitionModule.abort();
    if (draft?.auditId) void taskApi.assistantDecision(draft.auditId, false).catch(() => undefined);
    resetDraft();
    setError('');
    onClose();
  }

  function resetDraft() {
    setDraft(null);
    setCategoryOpen(false);
    setTitle('');
    setDescription('');
    setSelectedSkillId('');
    setBudget('');
    setTiming('NORMAL');
  }

  function useDraft() {
    if (!draft || !detailsReady || !selectedCoordinates) {
      setError('Complete the required details before reviewing the task.');
      return;
    }
    onUseDraft(
      {
        ...draft,
        title: title.trim(),
        description: description.trim(),
        skillId: selectedSkillId,
        category: selectedSkill?.name ?? draft.category,
        locationDescription: taskLocation.trim(),
        budget: Number(budget),
        urgencyLevel: timing,
      },
      { coordinates: selectedCoordinates, description: taskLocation.trim() },
    );
    resetDraft();
    setError('');
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow" color={colors.primary}>
                TASK ASSISTANT
              </AppText>
              <AppText variant="subtitle">Tell us what needs doing</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close task assistant"
              onPress={close}
              style={[styles.close, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Ionicons name="close" size={21} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {!draft ? (
              <TranscriptStep
                transcript={transcript}
                listening={listening}
                loading={loading}
                pulse={pulse}
                waveValues={waveValues}
                isDark={isDark}
                onToggleListening={() => void toggleListening()}
                onChangeTranscript={editTranscript}
                onPrepare={() => void prepareDraft()}
              />
            ) : (
              <DetailsStep
                draft={draft}
                title={title}
                description={description}
                skills={skills}
                selectedSkill={selectedSkill}
                categoryOpen={categoryOpen}
                taskLocation={taskLocation}
                hasCoordinates={Boolean(selectedCoordinates)}
                budget={budget}
                timing={timing}
                locating={locating}
                detailsReady={detailsReady}
                onChangeTitle={setTitle}
                onChangeDescription={setDescription}
                onToggleCategory={() => setCategoryOpen((current) => !current)}
                onSelectSkill={(id) => {
                  setSelectedSkillId(id);
                  setCategoryOpen(false);
                }}
                onChangeLocation={setTaskLocation}
                onUseCurrentLocation={() => void useCurrentLocation()}
                onChangeBudget={setBudget}
                onChangeTiming={setTiming}
                onUseDraft={useDraft}
                onEditTranscript={resetDraft}
              />
            )}

            {error ? (
              <AppText color={colors.danger} style={styles.error}>
                {error}
              </AppText>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function TranscriptStep({
  transcript,
  listening,
  loading,
  pulse,
  waveValues,
  isDark,
  onToggleListening,
  onChangeTranscript,
  onPrepare,
}: {
  transcript: string;
  listening: boolean;
  loading: boolean;
  pulse: Animated.Value;
  waveValues: Animated.Value[];
  isDark: boolean;
  onToggleListening(): void;
  onChangeTranscript(value: string): void;
  onPrepare(): void;
}) {
  const { colors } = useAppTheme();
  return (
    <>
      <View style={styles.voiceStage}>
        <LinearGradient
          colors={isDark ? ['#23255C', '#102F42'] : ['#EEF0FF', '#E8FAF7']}
          style={styles.voiceBackdrop}
        >
          <View style={styles.waveRow} aria-hidden>
            {WAVE_HEIGHTS.map((height, index) => (
              <Animated.View
                key={`${height}-${index}`}
                style={[
                  styles.wave,
                  {
                    height,
                    backgroundColor: colors.primary,
                    transform: [{ scaleY: waveValues[index] }],
                  },
                ]}
              />
            ))}
          </View>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop listening' : 'Start speaking'}
              onPress={onToggleListening}
              style={({ pressed }) => [
                styles.mic,
                {
                  backgroundColor: listening ? colors.danger : colors.primary,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <Ionicons name={listening ? 'stop' : 'mic'} size={34} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
          <View style={styles.voiceCopy}>
            <AppText variant="subtitle">
              {listening ? 'Listening now' : 'Tap once, then speak naturally'}
            </AppText>
            <AppText color={colors.textSecondary} style={styles.centerText}>
              Mention the job, its size, when you need it and your budget if you have one.
            </AppText>
          </View>
        </LinearGradient>
      </View>

      <AppText variant="caption" color={colors.textSecondary}>
        TaskGrid does not save your audio. Personal details are removed before text is sent to the
        model.
      </AppText>

      <TextField
        label="Your complete task note"
        placeholder="For example, my kitchen tap is leaking and I need it fixed today..."
        value={transcript}
        onChangeText={onChangeTranscript}
        editable={!listening}
        multiline
        scrollEnabled
        maxLength={3000}
        style={styles.transcript}
        textAlignVertical="top"
      />
      <View style={styles.counterRow}>
        <AppText variant="caption" color={colors.textMuted}>
          {listening
            ? 'Stop listening before editing.'
            : 'Scroll, review and edit what the phone heard.'}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {transcript.length}/3000
        </AppText>
      </View>
      <Button
        label="Shape this into a task"
        icon="sparkles-outline"
        loading={loading}
        disabled={transcript.trim().length < 12}
        onPress={onPrepare}
      />
    </>
  );
}

function DetailsStep({
  draft,
  title,
  description,
  skills,
  selectedSkill,
  categoryOpen,
  taskLocation,
  hasCoordinates,
  budget,
  timing,
  locating,
  detailsReady,
  onChangeTitle,
  onChangeDescription,
  onToggleCategory,
  onSelectSkill,
  onChangeLocation,
  onUseCurrentLocation,
  onChangeBudget,
  onChangeTiming,
  onUseDraft,
  onEditTranscript,
}: {
  draft: TaskAssistantDraft;
  title: string;
  description: string;
  skills: Skill[];
  selectedSkill: Skill | null;
  categoryOpen: boolean;
  taskLocation: string;
  hasCoordinates: boolean;
  budget: string;
  timing: 'NORMAL' | 'HIGH';
  locating: boolean;
  detailsReady: boolean;
  onChangeTitle(value: string): void;
  onChangeDescription(value: string): void;
  onToggleCategory(): void;
  onSelectSkill(id: string): void;
  onChangeLocation(value: string): void;
  onUseCurrentLocation(): void;
  onChangeBudget(value: string): void;
  onChangeTiming(value: 'NORMAL' | 'HIGH'): void;
  onUseDraft(): void;
  onEditTranscript(): void;
}) {
  const { colors } = useAppTheme();
  return (
    <>
      <View style={styles.detailsHeading}>
        <AppText variant="title">Check the details</AppText>
        <AppText color={colors.textSecondary}>
          The assistant filled what it could. Everything remains editable before the task is posted.
        </AppText>
      </View>

      {draft.followUpQuestions.length ? (
        <View style={styles.followUpCopy}>
          <AppText variant="bodyMedium">A few details still need your attention</AppText>
          {draft.followUpQuestions.slice(0, 4).map((question) => (
            <AppText key={question} variant="caption" color={colors.textSecondary}>
              • {question}
            </AppText>
          ))}
        </View>
      ) : null}

      <View style={styles.formSection}>
        <TextField
          label="Task title"
          placeholder="A short name for the task"
          value={title}
          onChangeText={onChangeTitle}
          maxLength={120}
        />
        <TextField
          label="Task description"
          placeholder="Explain what needs to be done"
          value={description}
          onChangeText={onChangeDescription}
          multiline
          scrollEnabled
          maxLength={3000}
          style={styles.description}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.formSection}>
        <AppText variant="caption">Type of service</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: categoryOpen }}
          onPress={onToggleCategory}
          style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.categorySelection}>
            <View style={[styles.categorySelectionIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons
                name={skillIconName(selectedSkill)}
                size={19}
                color={selectedSkill ? colors.primary : colors.textMuted}
              />
            </View>
            <AppText color={selectedSkill ? colors.text : colors.textMuted}>
              {selectedSkill?.name ?? 'Choose a service'}
            </AppText>
          </View>
          <Ionicons
            name={categoryOpen ? 'chevron-up' : 'chevron-down'}
            size={19}
            color={colors.textMuted}
          />
        </Pressable>
        {categoryOpen ? (
          <ScrollView
            nestedScrollEnabled
            style={[
              styles.categoryMenu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {skills.map((skill) => (
              <Pressable
                key={skill.id}
                onPress={() => onSelectSkill(skill.id)}
                style={[styles.categoryOption, { borderBottomColor: colors.divider }]}
              >
                <View style={styles.categoryOptionIdentity}>
                  <Ionicons
                    name={skillIconName(skill)}
                    size={19}
                    color={skill.id === selectedSkill?.id ? colors.primary : colors.textSecondary}
                  />
                  <AppText
                    variant={skill.id === selectedSkill?.id ? 'bodyMedium' : 'body'}
                    color={skill.id === selectedSkill?.id ? colors.primary : colors.text}
                  >
                    {skill.name}
                  </AppText>
                </View>
                {skill.id === selectedSkill?.id ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.formSection}>
        <View style={styles.locationHeading}>
          <View style={styles.flex}>
            <AppText variant="bodyMedium">Where is the task?</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Exact coordinates stay private until you accept a worker.
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={locating}
            onPress={onUseCurrentLocation}
            style={({ pressed }) => ({ opacity: locating ? 0.45 : pressed ? 0.65 : 1 })}
          >
            <AppText variant="button" color={colors.primary}>
              {locating ? 'Finding...' : 'Use current'}
            </AppText>
          </Pressable>
        </View>
        <TextField
          label="Area or landmark"
          placeholder="For example, Yaba or a nearby landmark"
          value={taskLocation}
          onChangeText={onChangeLocation}
          maxLength={500}
        />
        <AppText variant="caption" color={hasCoordinates ? colors.success : colors.warning}>
          {hasCoordinates
            ? 'Task coordinates are pinned.'
            : 'Use current location to pin the task before continuing.'}
        </AppText>
      </View>

      <View style={styles.formSection}>
        <MoneyField label="Budget" value={budget} onChangeText={onChangeBudget} />
        <View style={styles.priceHint}>
          <AppText variant="caption" color={colors.textMuted}>
            Suggested range
          </AppText>
          <AppText variant="bodyMedium" color={colors.primary}>
            ₦{money(draft.suggestedPriceMin)} – ₦{money(draft.suggestedPriceMax)}
          </AppText>
        </View>
      </View>

      <View style={styles.formSection}>
        <AppText variant="bodyMedium">When do you need it?</AppText>
        <View style={styles.timingRow}>
          {(
            [
              ['HIGH', 'As soon as possible', 'Time-sensitive'],
              ['NORMAL', 'Flexible', 'Not too urgent'],
            ] as const
          ).map(([value, label, detail]) => {
            const selected = timing === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onChangeTiming(value)}
                style={[
                  styles.timingOption,
                  {
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText variant="bodyMedium" color={selected ? colors.primary : colors.text}>
                  {label}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {detail}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {draft.safetyReviewSuggested ? (
        <View style={styles.safetyReview}>
          <AppText variant="bodyMedium" color={colors.warning}>
            This wording may need a human review
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Your task is not rejected. TaskGrid may ask an administrator to check it.
          </AppText>
        </View>
      ) : null}

      <Button
        label="Continue to final review"
        icon="arrow-forward"
        disabled={!detailsReady}
        onPress={onUseDraft}
      />
      <Button label="Edit my voice note" variant="ghost" onPress={onEditTranscript} />
    </>
  );
}

function mergeTranscript(base: string, incoming: string) {
  const stable = base.trim();
  const heard = incoming.trim();
  if (!stable) return heard;
  if (!heard) return stable;
  const stableLower = stable.toLowerCase();
  const heardLower = heard.toLowerCase();
  if (stableLower.endsWith(heardLower)) return stable;
  if (heardLower.startsWith(stableLower)) return heard;

  const stableWords = stable.split(/\s+/);
  const heardWords = heard.split(/\s+/);
  const maximumOverlap = Math.min(stableWords.length, heardWords.length);
  for (let overlap = maximumOverlap; overlap > 0; overlap -= 1) {
    const ending = stableWords.slice(-overlap).join(' ').toLowerCase();
    const beginning = heardWords.slice(0, overlap).join(' ').toLowerCase();
    if (ending === beginning) {
      return [...stableWords, ...heardWords.slice(overlap)].join(' ');
    }
  }
  return `${stable} ${heard}`;
}

function speechRecognitionMessage(error: string) {
  if (error === 'network' || error === 'network-timeout') {
    return 'Speech recognition needs a connection right now. Check your internet and try again.';
  }
  if (error === 'language-not-supported') {
    return 'Your phone speech service does not support this language yet. Update it and try again.';
  }
  if (error === 'service-not-allowed' || error === 'not-allowed') {
    return 'Voice input is blocked on this phone. Allow microphone and speech access, then try again.';
  }
  if (error === 'audio-capture') {
    return 'The microphone is being used by another app. Close it and try again.';
  }
  return 'We could not transcribe that. You can try again or type your task instead.';
}

function money(value: number) {
  return Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xl },
  voiceStage: { borderRadius: radius.xl, overflow: 'hidden' },
  voiceBackdrop: {
    minHeight: 350,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
  },
  waveRow: { height: 72, flexDirection: 'row', alignItems: 'center', gap: 6 },
  wave: { width: 5, borderRadius: 4, opacity: 0.78 },
  mic: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  voiceCopy: { alignItems: 'center', gap: spacing.sm, maxWidth: 290 },
  centerText: { textAlign: 'center' },
  flex: { flex: 1 },
  transcript: { height: 210, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  description: { height: 150, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: -spacing.lg,
  },
  detailsHeading: { gap: spacing.sm, maxWidth: 370 },
  followUpCopy: { gap: spacing.xs },
  formSection: { gap: spacing.md },
  selector: {
    minHeight: 56,
    borderWidth: 1.25,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  categorySelection: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categorySelectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMenu: { maxHeight: 230, borderWidth: 1, borderRadius: radius.md },
  categoryOption: {
    minHeight: 52,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  categoryOptionIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  locationHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  priceHint: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  timingRow: { flexDirection: 'row', gap: spacing.md },
  timingOption: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1.25,
    borderRadius: radius.md,
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  safetyReview: { gap: spacing.xs },
  error: { textAlign: 'center' },
});
