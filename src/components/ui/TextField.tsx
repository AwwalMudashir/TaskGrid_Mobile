import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { AppText } from "@/src/components/ui/AppText";
import { useKeyboardInputVisibility } from "@/src/components/ui/Screen";
import { fonts, radius, spacing, useAppTheme } from "@/src/theme";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  countryCode?: string;
  keyboardAware?: boolean;
};

export function TextField({
  label,
  error,
  icon,
  countryCode,
  keyboardAware = true,
  secureTextEntry,
  style,
  ...props
}: TextFieldProps) {
  const { colors } = useAppTheme();
  const keyboardVisibility = useKeyboardInputVisibility();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.danger
              : focused
                ? colors.primary
                : colors.border,
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? colors.primary : colors.textMuted}
          />
        ) : null}
        {countryCode ? (
          <>
            <View
              accessible
              accessibilityLabel={`Country code ${countryCode}. This is the only option for now.`}
              style={[
                styles.countryCode,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <AppText
                variant="bodyMedium"
                color={focused ? colors.primary : colors.text}
              >
                {countryCode}
              </AppText>
              <Ionicons
                name="chevron-down"
                size={14}
                color={colors.textMuted}
              />
            </View>
            <View
              style={[styles.divider, { backgroundColor: colors.divider }]}
            />
          </>
        ) : null}
        <TextInput
          {...props}
          secureTextEntry={secureTextEntry ? hidden : false}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            if (keyboardAware) keyboardVisibility?.revealInput(event.target);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[styles.input, { color: colors.text }, style]}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            onPress={() => setHidden((value) => !value)}
            hitSlop={12}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { marginLeft: 2 },
  inputShell: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.25,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 54,
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
  countryCode: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  divider: {
    width: 1,
    height: 28,
    marginHorizontal: 2,
  },
});
