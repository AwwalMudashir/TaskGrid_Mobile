import { useFocusEffect } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type ViewStyle } from 'react-native';

type AnimatedEntranceProps = PropsWithChildren<{
  delay?: number;
  style?: ViewStyle;
}>;

export function AnimatedEntrance({ children, delay = 0, style }: AnimatedEntranceProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.975)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        scale.setValue(1);
        return;
      }

      opacity.setValue(0);
      translateY.setValue(20);
      scale.setValue(0.975);
      const animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 480,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 480,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animation.start();
      return () => animation.stop();
    }, [delay, opacity, reduceMotion, scale, translateY]),
  );

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}
