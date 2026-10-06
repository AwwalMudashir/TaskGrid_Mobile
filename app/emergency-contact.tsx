import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/src/components/ui/AppText";
import { AuthHeader } from "@/src/components/ui/AuthHeader";
import { Button } from "@/src/components/ui/Button";
import { Screen } from "@/src/components/ui/Screen";
import { FormFieldsSkeleton } from "@/src/components/ui/SkeletonLoader";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { TextField } from "@/src/components/ui/TextField";
import { emergencyContactApi } from "@/src/features/tasks/task-api";
import { ApiError } from "@/src/lib/api";
import { spacing, useAppTheme } from "@/src/theme";

export default function EmergencyContactScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingContact, setLoadingContact] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingContact(true);
      void emergencyContactApi
        .current()
        .then((contact) => {
          if (active && contact) {
            setName(contact.name);
            setPhone(contact.phoneNumber);
          }
        })
        .catch(() => {
          if (active)
            setError(
              "We couldn't load your contact. You can still enter one below.",
            );
        })
        .finally(() => {
          if (active) setLoadingContact(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function save() {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    setError("");
    try {
      await emergencyContactApi.save(name.trim(), phone.trim());
      router.back();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We couldn't save your contact. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen} keyboard>
      <AuthHeader
        title="Emergency contact"
        subtitle="A trusted person we can reach if a task becomes unsafe."
      />
      <SurfaceCard style={styles.card}>
        <AppText variant="subtitle">Someone you trust</AppText>
        <AppText color={colors.textSecondary}>
          Ask for their permission first. Your contact is kept private from
          other users.
        </AppText>
        {loadingContact ? (
          <FormFieldsSkeleton count={2} />
        ) : (
          <>
            <TextField
              label="Contact name"
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextField
              label="Phone number"
              placeholder="08012345678"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </>
        )}
        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        <Button
          label="Save contact"
          onPress={save}
          loading={saving}
          disabled={loadingContact || !name.trim() || !phone.trim()}
        />
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  card: { gap: spacing.lg },
});
