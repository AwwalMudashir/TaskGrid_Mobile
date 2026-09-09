import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

const artwork: Record<AuthArtworkName, ImageSourcePropType> = {
  login: require('../../../assets/images/auth/login-trust.png'),
  recovery: require('../../../assets/images/auth/password-recovery.png'),
  registration: require('../../../assets/images/auth/registration.png'),
  email: require('../../../assets/images/auth/email-verification.png'),
};

export type AuthArtworkName = 'login' | 'recovery' | 'registration' | 'email';

type AuthArtworkProps = {
  name: AuthArtworkName;
  width?: number;
  height?: number;
};

export function AuthArtwork({ name, width = 150, height = 150 }: AuthArtworkProps) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={artwork[name]}
      style={[styles.image, { width, height }]}
    />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center' },
});
