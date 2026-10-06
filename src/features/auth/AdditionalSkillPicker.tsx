import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import type { Skill } from '@/src/features/auth/types';
import { radius, spacing, useAppTheme } from '@/src/theme';

const MAX_ADDITIONAL_SKILLS = 4;

type Props = {
  visible: boolean;
  skills: Skill[];
  primarySkillId: string;
  selectedIds: string[];
  onOpen(): void;
  onClose(): void;
  onChange(ids: string[]): void;
};

export function AdditionalSkillPicker({
  visible,
  skills,
  primarySkillId,
  selectedIds,
  onOpen,
  onClose,
  onChange,
}: Props) {
  const { colors } = useAppTheme();
  const available = skills.filter((skill) => skill.id !== primarySkillId);
  const selected = selectedIds
    .map((id) => skills.find((skill) => skill.id === id))
    .filter((skill): skill is Skill => skill !== undefined)
    .filter((skill) => skill.id !== primarySkillId);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    if (selectedIds.length < MAX_ADDITIONAL_SKILLS) onChange([...selectedIds, id]);
  }

  return (
    <View style={styles.field}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <AppText variant="caption">Other skills (optional)</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Add up to four more services you can confidently provide.
          </AppText>
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          {selected.length}/{MAX_ADDITIONAL_SKILLS}
        </AppText>
      </View>

      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.map((skill) => (
            <Pressable
              key={skill.id}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${skill.name}`}
              onPress={() => toggle(skill.id)}
              style={[styles.chip, { backgroundColor: colors.primarySoft }]}
            >
              <AppText variant="caption" color={colors.primary}>
                {skill.name}
              </AppText>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose additional skills"
        onPress={onOpen}
        disabled={!primarySkillId}
        style={({ pressed }) => [
          styles.selector,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: !primarySkillId ? 0.5 : pressed ? 0.78 : 1,
          },
        ]}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <AppText style={styles.selectorCopy} color={colors.textSecondary}>
          {selected.length > 0 ? 'Edit other skills' : 'Add other skills'}
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={() => undefined}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeading}>
              <View style={styles.headingCopy}>
                <AppText variant="subtitle">Choose other skills</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Your primary skill stays highlighted as your main speciality.
                </AppText>
              </View>
              <AppText variant="caption" color={colors.primary}>
                {selectedIds.length}/{MAX_ADDITIONAL_SKILLS}
              </AppText>
            </View>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {available.map((skill) => {
                const checked = selectedIds.includes(skill.id);
                const disabled = !checked && selectedIds.length >= MAX_ADDITIONAL_SKILLS;
                return (
                  <Pressable
                    key={skill.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked, disabled }}
                    disabled={disabled}
                    onPress={() => toggle(skill.id)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: checked ? colors.primarySoft : colors.surfaceSecondary,
                        borderColor: checked ? colors.primary : colors.border,
                        opacity: disabled ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={(skill.iconName as keyof typeof Ionicons.glyphMap) ?? 'construct-outline'}
                      size={20}
                      color={checked ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.optionCopy}>
                      <AppText variant="bodyMedium">{skill.name}</AppText>
                      {skill.description ? (
                        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                          {skill.description}
                        </AppText>
                      ) : null}
                    </View>
                    <Ionicons
                      name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={21}
                      color={checked ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button label="Done" onPress={onClose} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  heading: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  headingCopy: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    minHeight: 32,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selector: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorCopy: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 24, 0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  handle: { width: 44, height: 4, borderRadius: radius.pill, alignSelf: 'center' },
  modalHeading: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  list: { gap: spacing.sm },
  option: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionCopy: { flex: 1, gap: 2 },
});
