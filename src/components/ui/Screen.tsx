import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing, useAppTheme } from "@/src/theme";

type ScreenProps = PropsWithChildren<{
  contentStyle?: ViewStyle;
  keyboard?: boolean;
}>;

type KeyboardScrollContextValue = {
  revealInput(nodeHandle: unknown): void;
};

const KeyboardScrollContext = createContext<KeyboardScrollContextValue | null>(
  null,
);

export function useKeyboardInputVisibility() {
  return useContext(KeyboardScrollContext);
}

export function Screen({
  children,
  contentStyle,
  keyboard = false,
}: ScreenProps) {
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const focusedInputRef = useRef<unknown>(null);
  const delayedScrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollInputAboveKeyboard = useCallback((nodeHandle: unknown) => {
    if (!nodeHandle) return;
    scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
      nodeHandle,
      spacing.xl,
      true,
    );
  }, []);

  const revealInput = useCallback(
    (nodeHandle: unknown) => {
      focusedInputRef.current = nodeHandle;
      requestAnimationFrame(() => scrollInputAboveKeyboard(nodeHandle));
      if (delayedScrollRef.current) clearTimeout(delayedScrollRef.current);
      delayedScrollRef.current = setTimeout(
        () => scrollInputAboveKeyboard(nodeHandle),
        280,
      );
    },
    [scrollInputAboveKeyboard],
  );

  useEffect(() => {
    if (!keyboard) return;
    const eventName =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(eventName, () => {
      if (focusedInputRef.current) revealInput(focusedInputRef.current);
    });
    return () => {
      subscription.remove();
      if (delayedScrollRef.current) clearTimeout(delayedScrollRef.current);
    };
  }, [keyboard, revealInput]);

  const content = (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets={keyboard && Platform.OS === "ios"}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <KeyboardScrollContext.Provider value={keyboard ? { revealInput } : null}>
        {keyboard ? (
          <KeyboardAvoidingView
            style={styles.safe}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </KeyboardScrollContext.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
