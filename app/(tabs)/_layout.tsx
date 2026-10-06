import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useCallback, useRef } from "react";
import { Pressable, type PressableProps, View } from "react-native";

import { useAuth } from "@/src/features/auth/AuthContext";
import {
  type TourTargetKey,
  useTourTargets,
} from "@/src/features/onboarding/TourTargetRegistry";
import { fonts, useAppTheme } from "@/src/theme";

type NativeTabButtonProps = PressableProps & { href?: string };

function MeasuredTabButton({
  target,
  buttonProps,
}: {
  target: TourTargetKey;
  buttonProps: NativeTabButtonProps;
}) {
  const ref = useRef<View>(null);
  const { registerTarget } = useTourTargets();
  const { href: _href, onLayout, ...nativeProps } = buttonProps;

  const measure = useCallback(() => {
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) return;
        registerTarget(target, {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        });
      });
    });
  }, [registerTarget, target]);

  return (
    <Pressable
      {...nativeProps}
      ref={ref}
      collapsable={false}
      onLayout={(event) => {
        onLayout?.(event);
        measure();
      }}
    />
  );
}

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarButton: (props) => (
            <MeasuredTabButton
              target="tasks"
              buttonProps={props as NativeTabButtonProps}
            />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "clipboard" : "clipboard-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarButton: (props) => (
            <MeasuredTabButton
              target="messages"
              buttonProps={props as NativeTabButtonProps}
            />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          href: user?.role === "RUNNER" ? undefined : null,
          tabBarButton:
            user?.role === "RUNNER"
              ? (props) => (
                  <MeasuredTabButton
                    target="wallet"
                    buttonProps={props as NativeTabButtonProps}
                  />
                )
              : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "wallet" : "wallet-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarButton: (props) => (
            <MeasuredTabButton
              target="profile"
              buttonProps={props as NativeTabButtonProps}
            />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
