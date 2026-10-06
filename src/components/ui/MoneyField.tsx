import type { ReactNode } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/src/components/ui/AppText";
import { useKeyboardInputVisibility } from "@/src/components/ui/Screen";
import { fonts, radius, spacing, useAppTheme } from "@/src/theme";

type Props = {
  label: string;
  value: string;
  onChangeText(value: string): void;
  editable?: boolean;
  labelAccessory?: ReactNode;
  keyboardAware?: boolean;
};

function cleanAmount(text: string) {
  const [whole = "", ...fractionParts] = text.replace(/[^\d.]/g, "").split(".");
  const trimmedWhole = whole.slice(0, 12).replace(/^0+(?=\d)/, "");
  if (fractionParts.length === 0) return trimmedWhole;
  return `${trimmedWhole || "0"}.${fractionParts.join("").slice(0, 2)}`;
}

export function MoneyField({
  label,
  value,
  onChangeText,
  editable = true,
  labelAccessory,
  keyboardAware = true,
}: Props) {
  const { colors } = useAppTheme();
  const keyboardVisibility = useKeyboardInputVisibility();
  const [whole, fraction] = value.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const inputValue =
    fraction === undefined ? groupedWhole : `${groupedWhole}.${fraction}`;
  const decimalSuffix =
    fraction === undefined ? ".00" : "".padEnd(2 - fraction.length, "0");

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
        {labelAccessory}
      </View>
      <View
        style={[
          styles.shell,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <AppText variant="bodyMedium" color={colors.textSecondary}>
          ₦
        </AppText>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          value={inputValue}
          onFocus={(event) => {
            if (keyboardAware) keyboardVisibility?.revealInput(event.target);
          }}
          onChangeText={(text) => onChangeText(cleanAmount(text))}
          editable={editable}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
        <AppText color={colors.textMuted}>{decimalSuffix}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  labelRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: { marginLeft: 2 },
  shell: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1.25,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 54,
    textAlign: "right",
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
});
