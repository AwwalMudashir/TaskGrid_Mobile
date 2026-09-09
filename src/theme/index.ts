import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  createElement,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';

export const lightColors = {
  primary: '#5557E8',
  primaryPressed: '#4547C9',
  primarySoft: '#EEF0FF',
  brandDark: '#172033',
  accent: '#0B9F94',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F2F7',
  text: '#172033',
  textSecondary: '#4C5870',
  textMuted: '#778197',
  textOnPrimary: '#FFFFFF',
  border: '#E3E7EF',
  divider: '#E9ECF2',
  success: '#15803D',
  successSoft: '#ECFDF3',
  warning: '#D97706',
  warningSoft: '#FFF7ED',
  danger: '#DC2626',
  dangerSoft: '#FEF3F2',
  info: '#0284C7',
  infoSoft: '#F0F9FF',
} as const;

export const darkColors = {
  primary: '#9A9BFF',
  primaryPressed: '#7F81F1',
  primarySoft: '#25264D',
  brandDark: '#F5F7FF',
  accent: '#42D4C8',
  background: '#0B1020',
  surface: '#141A2B',
  surfaceSecondary: '#1B2438',
  text: '#F7F8FC',
  textSecondary: '#C0C7D6',
  textMuted: '#8F99AD',
  textOnPrimary: '#101329',
  border: '#2B354A',
  divider: '#232D42',
  success: '#4ADE80',
  successSoft: '#123524',
  warning: '#FBBF24',
  warningSoft: '#3B2A0A',
  danger: '#F87171',
  dangerSoft: '#3B1518',
  info: '#38BDF8',
  infoSoft: '#0C2E40',
} as const;

export type AppColors = { [Key in keyof typeof lightColors]: string };

export const fonts = {
  headingMedium: 'Manrope_500Medium',
  headingSemiBold: 'Manrope_600SemiBold',
  headingBold: 'Manrope_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 2,
  },
};

export type ThemePreference = 'system' | 'light' | 'dark';

type AppThemeContextValue = {
  colors: AppColors;
  isDark: boolean;
  preference: ThemePreference;
  setThemePreference(preference: ThemePreference): Promise<void>;
};

const THEME_PREFERENCE_KEY = 'taskgrid.themePreference';
const AppThemeContext = createContext<AppThemeContextValue | null>(null);

async function readThemePreference(): Promise<ThemePreference | null> {
  const stored =
    Platform.OS === 'web'
      ? typeof window === 'undefined'
        ? null
        : window.localStorage.getItem(THEME_PREFERENCE_KEY)
      : await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);

  return stored === 'system' || stored === 'light' || stored === 'dark' ? stored : null;
}

async function saveThemePreference(preference: ThemePreference) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(THEME_PREFERENCE_KEY, preference);
    return;
  }
  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;
    readThemePreference()
      .then((stored) => {
        if (mounted && stored) setPreference(stored);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const setThemePreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreference(nextPreference);
    await saveThemePreference(nextPreference).catch(() => undefined);
  }, []);

  const isDark = preference === 'system' ? systemColorScheme === 'dark' : preference === 'dark';
  const value = useMemo<AppThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      preference,
      setThemePreference,
    }),
    [isDark, preference, setThemePreference],
  );

  return createElement(AppThemeContext.Provider, { value }, children);
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  const systemColorScheme = useColorScheme();
  if (context) return context;

  const isDark = systemColorScheme === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    preference: 'system' as const,
    setThemePreference: async () => undefined,
  };
}
