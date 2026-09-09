import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { LocalProfileImage, UpdateProfilePayload, User } from '@/src/features/auth/types';
import { ApiError, authApi, profileApi } from '@/src/lib/api';
import { clearSessionTokens, getSessionTokens, saveSessionTokens } from '@/src/lib/token-storage';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  reloadProfile(): Promise<void>;
  updateProfile(payload: UpdateProfilePayload, picture?: LocalProfileImage | null): Promise<void>;
  removeProfilePicture(): Promise<void>;
  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const tokens = await getSessionTokens();
        if (!tokens) return;
        const currentUser = await authApi.me();
        if (mounted) setUser(currentUser);
      } catch {
        await clearSessionTokens();
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async signIn(email, password) {
        const session = await authApi.login(email.trim().toLowerCase(), password);
        await saveSessionTokens(session);
        setUser(session.user);
      },
      async signOut() {
        const tokens = await getSessionTokens();
        try {
          if (tokens?.refreshToken) await authApi.logout(tokens.refreshToken);
        } finally {
          await clearSessionTokens();
          setUser(null);
        }
      },
      async reloadProfile() {
        setUser(await authApi.me());
      },
      async updateProfile(payload, picture) {
        let updated = await profileApi.update(payload);
        if (picture) {
          try {
            updated = await profileApi.replacePicture(picture);
          } catch (cause) {
            setUser(updated);
            if (cause instanceof Error) {
              throw new ApiError(
                `Your account details were saved, but the picture was not uploaded. ${cause.message}`,
                cause instanceof ApiError ? cause.code : 0,
              );
            }
            throw cause;
          }
        }
        setUser(updated);
      },
      async removeProfilePicture() {
        setUser(await profileApi.removePicture());
      },
      async changePassword(currentPassword, newPassword, confirmPassword) {
        await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
