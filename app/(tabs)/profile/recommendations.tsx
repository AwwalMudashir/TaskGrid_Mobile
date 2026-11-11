import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import type { RecommendationPreference } from '@/src/features/auth/types';
import { profileApi } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const MATCH_LEVELS = [65, 70, 75, 80, 85, 90];

const SCORE_PARTS = [
  { label: 'Primary skill match', value: '50 points', note: 'The strongest signal' },
  { label: 'Additional skill match', value: '25 points', note: 'Supports your other abilities' },
  { label: 'Distance', value: 'Up to 25', note: 'Closer tasks score higher' },
  { label: 'Similar completed work', value: '15 points', note: 'Relevant TaskGrid history' },
  { label: 'Recently posted', value: 'Up to 10', note: 'A small freshness boost' },
];

function levelMeaning(level: number) {
  if (level === 65) return 'Balanced. Strong primary or additional-skill matches can qualify.';
  if (level === 70) return 'Strict. Additional-skill tasks need most supporting points.';
  if (level === 75) return 'Very strict. An additional-skill task needs every supporting point.';
  return 'Primary-skill only. Additional-skill tasks cannot reach this level.';
}

export default function RecommendationPreferencesScreen() {
  const { colors } = useAppTheme();
  const [preference, setPreference] = useState<RecommendationPreference | null>(null);
  const [selected, setSelected] = useState(65);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  function load() {
    setLoading(true);
    setFailed(false);
    profileApi
      .recommendationPreference()
      .then((value) => {
        setPreference(value);
        setSelected(value.minimumScore);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save() {
    setSaving(true);
    try {
      const updated = await profileApi.updateRecommendationPreference(selected);
      setPreference(updated);
      setSelected(updated.minimumScore);
      Alert.alert(
        'Match level saved',
        `Only tasks scoring ${updated.minimumScore}% or more will appear.`,
      );
    } catch {
      Alert.alert('Could not save match level', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <AuthHeader title="Task recommendations" />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText color={colors.textSecondary}>Loading your match level</AppText>
        </View>
      ) : failed || !preference ? (
        <View style={styles.loading}>
          <Ionicons name="cloud-offline-outline" size={34} color={colors.textMuted} />
          <AppText variant="subtitle">Could not load this setting</AppText>
          <Button label="Try again" variant="secondary" onPress={load} />
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <AppText variant="caption" color={colors.textMuted}>
              YOUR MINIMUM MATCH
            </AppText>
            <AppText style={styles.percentage} color={colors.primary}>
              {selected}%
            </AppText>
            <AppText color={colors.textSecondary} style={styles.center}>
              Higher levels show fewer tasks, but each one must match your profile more closely.
            </AppText>
          </View>

          <View style={styles.levels}>
            {MATCH_LEVELS.map((level) => {
              const active = selected === level;
              return (
                <Pressable
                  key={level}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(level)}
                  style={[
                    styles.level,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="bodyMedium"
                    color={active ? colors.textOnPrimary : colors.text}
                  >
                    {level}%
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.centeredHint}>
            {levelMeaning(selected)}
          </AppText>

          <View style={[styles.rule, { borderColor: colors.divider }]}>
            <AppText variant="subtitle">How TaskGrid scores a task</AppText>
            <AppText color={colors.textSecondary}>
              A task earns points from the signals below. The final score is capped at 100.
            </AppText>
            <View style={styles.parts}>
              {SCORE_PARTS.map((part) => (
                <View key={part.label} style={styles.part}>
                  <View style={styles.partCopy}>
                    <AppText variant="bodyMedium">{part.label}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {part.note}
                    </AppText>
                  </View>
                  <AppText variant="bodyMedium" color={colors.primary}>
                    {part.value}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          <Button
            label={selected === preference.minimumScore ? 'Match level saved' : 'Save match level'}
            onPress={save}
            loading={saving}
            disabled={selected === preference.minimumScore}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  loading: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  percentage: { fontSize: 56, lineHeight: 64, fontWeight: '700' },
  center: { textAlign: 'center', maxWidth: 330 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  centeredHint: { textAlign: 'center' },
  level: {
    minWidth: 70,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  rule: { gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.xl },
  parts: { gap: spacing.lg, paddingTop: spacing.md },
  part: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  partCopy: { flex: 1, gap: 2 },
});
