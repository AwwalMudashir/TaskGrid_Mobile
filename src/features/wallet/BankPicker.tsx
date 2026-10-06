import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AppText } from "@/src/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/src/theme";
import type { PayoutBank } from "./payout-account";

type Props = {
  visible: boolean;
  banks: PayoutBank[];
  onChoose(bank: PayoutBank): void;
  onClose(): void;
};

export function BankPicker({ visible, banks, onChoose, onClose }: Props) {
  const { colors } = useAppTheme();
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const uniqueByCode = new Map<string, PayoutBank>();
    for (const bank of banks) {
      if (!uniqueByCode.has(bank.code)) uniqueByCode.set(bank.code, bank);
    }
    return [...uniqueByCode.values()].filter((bank) =>
      bank.name.toLowerCase().includes(search.trim().toLowerCase()),
    );
  }, [banks, search]);
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <AppText variant="eyebrow" color={colors.primary}>
              BANKS
            </AppText>
            <View style={styles.heading}>
              <AppText variant="title">Choose a bank</AppText>
              <Pressable accessibilityLabel="Close bank list" onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search banks"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.search,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
            <FlatList
              data={filtered}
              keyExtractor={(bank) => bank.code}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <AppText color={colors.textMuted}>
                  No banks match that search.
                </AppText>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChoose(item);
                    setSearch("");
                  }}
                  style={[styles.item, { borderBottomColor: colors.divider }]}
                >
                  <AppText style={styles.copy}>{item.name}</AppText>
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={colors.textMuted}
                  />
                </Pressable>
              )}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(12,20,38,0.62)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    maxHeight: "82%",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  item: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  copy: { flex: 1, gap: 2 },
});
