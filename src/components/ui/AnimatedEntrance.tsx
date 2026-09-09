import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, type ViewStyle } from 'react-native';

type AnimatedEntranceProps = PropsWithChildren<{
  delay?: number;
  style?: ViewStyle;
}>;

export function AnimatedEntrance({ children, delay = 0, style }: AnimatedEntranceProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 0,
        delay,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, reduceMotion, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
