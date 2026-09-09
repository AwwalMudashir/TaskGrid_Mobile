import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="check-email" />
    </Stack>
  );
}
