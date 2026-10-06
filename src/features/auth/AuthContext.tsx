import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { LocalProfileImage, UpdateProfilePayload, User } from '@/src/features/auth/types';
import { unregisterCurrentDeviceForPush } from '@/src/features/notifications/push-notifications';
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

const SESSION_RESTORE_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Session restore timed out.')), timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const tokens = await withTimeout(getSessionTokens(), SESSION_RESTORE_TIMEOUT_MS);
        if (!tokens) return;
        const currentUser = await withTimeout(authApi.me(), SESSION_RESTORE_TIMEOUT_MS);
        if (mounted) setUser(currentUser);
      } catch {
        try {
          await withTimeout(clearSessionTokens(), SESSION_RESTORE_TIMEOUT_MS);
        } catch {
          // A storage failure must not keep the application on the splash screen.
        }
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
          try {
            await unregisterCurrentDeviceForPush();
          } catch {}
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
            const validationMessage =
              cause instanceof ApiError && cause.code >= 400 && cause.code < 500
                ? ` ${cause.message}`
                : ' Please choose the photo again and try once more.';
            throw new ApiError(
              `Your profile information was saved, but we couldn't update your photo.${validationMessage}`,
              cause instanceof ApiError ? cause.code : 0,
            );
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
