import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/src/components/ui/AppText";
import { AuthHeader } from "@/src/components/ui/AuthHeader";
import { Button } from "@/src/components/ui/Button";
import { MoneyField } from "@/src/components/ui/MoneyField";
import { Screen } from "@/src/components/ui/Screen";
import { SkeletonBlock } from "@/src/components/ui/SkeletonLoader";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { TextField } from "@/src/components/ui/TextField";
import type { LocalProfileImage, Skill } from "@/src/features/auth/types";
import { TaskPhotoPicker } from "@/src/features/tasks/TaskPhotoPicker";
import {
  emergencyContactApi,
  taskApi,
  type EmergencyContact,
} from "@/src/features/tasks/task-api";
import { ApiError, skillsApi } from "@/src/lib/api";
import { radius, spacing, useAppTheme } from "@/src/theme";

export default function NewTaskScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [contact, setContact] = useState<EmergencyContact | null>(null);
  const [contactState, setContactState] = useState<
    "checking" | "present" | "missing" | "error"
  >("checking");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillId, setSkillId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<LocalProfileImage[]>([]);
  const [area, setArea] = useState("");
  const [detectedArea, setDetectedArea] = useState("");
  const [budget, setBudget] = useState("");
  const [urgency, setUrgency] = useState<"NORMAL" | "HIGH">("NORMAL");
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setContactState("checking");
      void Promise.all([emergencyContactApi.current(), skillsApi.list()])
        .then(([saved, available]) => {
          if (active) {
            setContact(saved);
            setContactState(saved ? "present" : "missing");
            setSkills(available);
          }
        })
        .catch((cause) => {
          if (active) {
            setContactState("error");
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
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Allow location access to post a task at your current location.",
        );
        return;
      }
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPosition({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      });
      const addresses = await Location.reverseGeocodeAsync(result.coords).catch(
        () => [],
      );
      const address = addresses[0];
      setDetectedArea(
        address
          ? [address.district, address.city, address.region]
              .filter(Boolean)
              .join(", ")
          : "",
      );
    } catch {
      setError(
        "We couldn't find your location. Check your location settings and try again.",
      );
    } finally {
      setLocating(false);
    }
  }

  const selectedSkill = skills.find((skill) => skill.id === skillId);
  const parsedBudget = Number(budget);
  const validBudget =
    /^\d+(?:\.\d{1,2})?$/.test(budget.trim()) && parsedBudget > 0;
  const canPost = Boolean(
    title.trim() &&
    description.trim() &&
    skillId &&
    position &&
    contact &&
    validBudget,
  );

  async function post() {
    if (!canPost || !position || posting) return;
    setPosting(true);
    setError("");
    try {
      const task = await taskApi.post({
        title: title.trim(),
        description: description.trim(),
        skillId,
        locationDescription:
          area.trim() || detectedArea || "Location pinned on map",
        ...position,
        budget: parsedBudget,
        urgencyLevel: urgency,
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
        pathname: "/task/[id]",
        params: {
          id: task.id,
          ...(photoUploadFailed ? { photoUploadFailed: "true" } : {}),
        },
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't post your task. Try again.",
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen} keyboard>
      <AuthHeader
        title="Post a task"
        subtitle="Tell workers what you need and where."
      />
      {contactState === "missing" ? (
        <SurfaceCard style={styles.contactCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={28}
            color={colors.primary}
          />
          <AppText variant="subtitle">One safety step first</AppText>
          <AppText color={colors.textSecondary}>
            Add an emergency contact before posting or accepting tasks.
          </AppText>
          <Button
            label="Add emergency contact"
            variant="secondary"
            onPress={() => router.push("/emergency-contact")}
          />
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.form}>
        <TextField
          label="Task title"
          placeholder="e.g. Fix a leaking kitchen tap"
          value={title}
          onChangeText={setTitle}
          maxLength={180}
        />
        <TextField
          label="What needs doing?"
          placeholder="Describe the work clearly"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={4000}
          style={styles.description}
          textAlignVertical="top"
        />
        <TaskPhotoPicker
          label="Task photos (optional)"
          helper="Add up to 5 photos, no more than 20 MB altogether. Clear photos help workers quote accurately."
          images={photos}
          onChange={setPhotos}
          onError={setError}
        />
        <View style={styles.field}>
          <AppText variant="caption">Category</AppText>
          {contactState === "checking" ? (
            <SkeletonBlock height={54} borderRadius={radius.md} />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerOpen(true)}
              style={[
                styles.selector,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            >
              <AppText color={selectedSkill ? colors.text : colors.textMuted}>
                {selectedSkill?.name ?? "Choose a category"}
              </AppText>
              <Ionicons name="chevron-down" size={19} color={colors.primary} />
            </Pressable>
          )}
        </View>
        <TextField
          label="Area or neighbourhood (optional)"
          placeholder="e.g. Yaba, Lagos (no house number)"
          value={area}
          onChangeText={setArea}
          maxLength={500}
        />
        <Button
          label={
            position ? "Current location selected" : "Use my current location"
          }
          icon={position ? "checkmark-circle-outline" : "location-outline"}
          variant="secondary"
          loading={locating}
          onPress={getLocation}
        />
        <AppText variant="caption" color={colors.textMuted}>
          Your precise location is shown only to the worker you accept. You can
          post tasks at your current location for now.
        </AppText>
        <MoneyField
          label="Your budget"
          value={budget}
          onChangeText={setBudget}
        />
        <View style={styles.field}>
          <AppText variant="caption">Priority</AppText>
          <View style={styles.priorityRow}>
            {(["NORMAL", "HIGH"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: urgency === value }}
                onPress={() => setUrgency(value)}
                style={[
                  styles.priority,
                  {
                    borderColor:
                      urgency === value ? colors.primary : colors.border,
                    backgroundColor:
                      urgency === value ? colors.primarySoft : colors.surface,
                  },
                ]}
              >
                <AppText
                  color={
                    urgency === value ? colors.primary : colors.textSecondary
                  }
                >
                  {value === "NORMAL" ? "Flexible" : "Soon"}
                </AppText>
              </Pressable>
            ))}
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            Flexible means timing is open. Soon tells workers you would prefer a
            quicker response, it does not set a deadline or guarantee faster
            matching.
          </AppText>
        </View>
      </SurfaceCard>
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      <Button
        label="Post task"
        onPress={post}
        disabled={!canPost}
        loading={posting}
      />

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerOpen(false)}
          />
          <View style={[styles.picker, { backgroundColor: colors.surface }]}>
            <AppText variant="subtitle">Choose a category</AppText>
            <ScrollView style={styles.skillList}>
              {skills.map((skill) => (
                <Pressable
                  key={skill.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSkillId(skill.id);
                    setPickerOpen(false);
                  }}
                  style={[
                    styles.skillRow,
                    { borderBottomColor: colors.divider },
                  ]}
                >
                  <AppText>{skill.name}</AppText>
                  {skill.id === skillId ? (
                    <Ionicons
                      name="checkmark"
                      size={19}
                      color={colors.primary}
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  contactCard: { gap: spacing.md },
  form: { gap: spacing.lg },
  description: { minHeight: 100, paddingTop: spacing.md },
  field: { gap: spacing.sm },
  selector: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  priorityRow: { flexDirection: "row", gap: spacing.sm },
  priority: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(7,13,30,0.65)",
  },
  picker: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  skillList: { maxHeight: 430 },
  skillRow: {
    minHeight: 52,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
