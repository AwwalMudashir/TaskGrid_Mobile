import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { fonts, useAppTheme } from '@/src/theme';

type TextVariant =
  'display' | 'title' | 'subtitle' | 'body' | 'bodyMedium' | 'caption' | 'button' | 'eyebrow';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant;
    color?: string;
  }
>;

const variants: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.headingBold, fontSize: 34, lineHeight: 42, letterSpacing: -1 },
  title: { fontFamily: fonts.headingBold, fontSize: 27, lineHeight: 34, letterSpacing: -0.65 },
  subtitle: { fontFamily: fonts.headingSemiBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 23 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 20 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};

export function AppText({ variant = 'body', color, style, ...props }: AppTextProps) {
  const { colors } = useAppTheme();
  return <Text {...props} style={[variants[variant], { color: color ?? colors.text }, style]} />;
}
