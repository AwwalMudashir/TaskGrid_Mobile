import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { radius, spacing } from '@/src/theme';

type AnimatedSplashProps = {
  ready: boolean;
  onFinish(): void;
};

export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const artworkScale = useRef(new Animated.Value(0.82)).current;
  const artworkOffset = useRef(new Animated.Value(18)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyOffset = useRef(new Animated.Value(16)).current;
  const artworkMotion = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      reduceMotion.current = value;
    });

    Animated.parallel([
      Animated.spring(artworkScale, {
        toValue: 1,
        damping: 12,
        stiffness: 115,
        useNativeDriver: true,
      }),
      Animated.spring(artworkOffset, {
        toValue: 0,
        damping: 14,
        stiffness: 110,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(copyOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.spring(copyOffset, { toValue: 0, damping: 16, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(artworkMotion, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(artworkMotion, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [artworkMotion, artworkOffset, artworkScale, copyOffset, copyOpacity]);

  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(
      () => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: reduceMotion.current ? 180 : 420,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onFinish();
        });
      },
      reduceMotion.current ? 450 : 1750,
    );
    return () => clearTimeout(timeout);
  }, [onFinish, opacity, ready]);

  const floatingScale = artworkMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const floatingOffset = artworkMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const combinedScale = Animated.multiply(artworkScale, floatingScale);
  const combinedOffset = Animated.add(artworkOffset, floatingOffset);

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <LinearGradient
        colors={['#10233F', '#164E63', '#2563EB']}
        locations={[0, 0.58, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.center}>
          <Animated.Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={require('../../assets/images/auth/login-trust.png')}
            style={[
              styles.artwork,
              { transform: [{ scale: combinedScale }, { translateY: combinedOffset }] },
            ]}
          />
          <Animated.View
            style={[styles.copy, { opacity: copyOpacity, transform: [{ translateY: copyOffset }] }]}
          >
            <AppText variant="display" color="#FFFFFF">
              TaskGrid
            </AppText>
            <AppText variant="body" color="rgba(255,255,255,0.78)" style={styles.tagline}>
              Trusted local work, matched intelligently and paid securely.
            </AppText>
          </Animated.View>
        </View>
        <Animated.View style={[styles.footer, { opacity: copyOpacity }]}>
          <View style={styles.loadingTrack}>
            <Animated.View style={styles.loadingBar} />
          </View>
          <AppText variant="caption" color="rgba(255,255,255,0.68)">
            Built for trusted work in Nigeria
          </AppText>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  artwork: { width: 190, height: 206, zIndex: 2 },
  copy: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  tagline: { textAlign: 'center', maxWidth: 300 },
  footer: { alignItems: 'center', gap: spacing.md, paddingBottom: 46 },
  loadingTrack: {
    width: 72,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  loadingBar: {
    width: '72%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: '#5EEAD4',
  },
});
