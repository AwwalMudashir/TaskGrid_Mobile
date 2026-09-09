import { Platform } from 'react-native';

import type {
  AccountType,
  LocalProfileImage,
  ProfileImageUpload,
  RegisterPayload,
  Skill,
  TokenResponse,
  UpdateProfilePayload,
  User,
  WorkerSummary,
  TaskSummary,
  SupportOptions,
} from '@/src/features/auth/types';
import { clearSessionTokens, getSessionTokens, saveSessionTokens } from '@/src/lib/token-storage';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  isSuccess: boolean;
};

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  authenticated?: boolean;
  retryAfterRefresh?: boolean;
};

const localApiUrl = Platform.select({
  android: 'http://10.0.2.2:8080/api/v1',
  default: 'http://localhost:8080/api/v1',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? localApiUrl;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function connectionError(action: string) {
  return new ApiError(
    `Could not ${action} because the app cannot reach the TaskGrid server. Check that Spring Boot is running and that your phone and computer are on the same network.`,
    0,
  );
}

async function readPayload<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('The server returned an unreadable response.', response.status);
  }
}

async function refreshAccessToken() {
  const current = await getSessionTokens();
  if (!current?.refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  const payload = await readPayload<TokenResponse>(response);
  if (!response.ok || !payload.isSuccess) {
    await clearSessionTokens();
    return false;
  }

  await saveSessionTokens(payload.data);
  return true;
}

let refreshPromise: Promise<boolean> | null = null;

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const {
    body,
    authenticated = false,
    retryAfterRefresh = true,
    headers,
    ...requestOptions
  } = options;
  const tokens = authenticated ? await getSessionTokens() : null;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers,
        ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw connectionError('complete the request');
  }

  if (response.status === 401 && authenticated && retryAfterRefresh) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    if (await refreshPromise) {
      return apiRequest<T>(path, { ...options, retryAfterRefresh: false });
    }
  }

  const payload = await readPayload<T>(response);
  if (!response.ok || !payload.isSuccess) {
    throw new ApiError(payload.message || 'Something went wrong. Please try again.', payload.code);
  }
  return payload.data;
}

export const authApi = {
  register(accountType: AccountType, body: RegisterPayload) {
    return apiRequest<User>(`/auth/register?accountType=${accountType}`, {
      method: 'POST',
      body,
    });
  },
  login(email: string, password: string) {
    return apiRequest<TokenResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },
  verifyEmail(token: string) {
    return apiRequest<User>('/auth/verify-email', { method: 'POST', body: { token } });
  },
  resendVerification(email: string) {
    return apiRequest<null>('/auth/resend-verification', { method: 'POST', body: { email } });
  },
  forgotPassword(email: string) {
    return apiRequest<null>('/auth/forgot-password', { method: 'POST', body: { email } });
  },
  resetPassword(token: string, newPassword: string, confirmPassword: string) {
    return apiRequest<null>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword, confirmPassword },
    });
  },
  me() {
    return apiRequest<User>('/auth/me', { authenticated: true });
  },
  changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return apiRequest<null>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, confirmPassword },
      authenticated: true,
    });
  },
  logout(refreshToken: string) {
    return apiRequest<null>('/auth/logout', { method: 'POST', body: { refreshToken } });
  },
};

export const skillsApi = {
  list() {
    return apiRequest<Skill[]>('/skills');
  },
};

export const mediaApi = {
  async uploadProfileImage(image: LocalProfileImage) {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const imageResponse = await fetch(image.uri);
      form.append('file', await imageResponse.blob(), image.fileName);
    } else {
      form.append('file', {
        uri: image.uri,
        name: image.fileName,
        type: image.mimeType,
      } as unknown as Blob);
    }

    const response = await fetch(`${API_BASE_URL}/media/profile-image`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
    const payload = await readPayload<ProfileImageUpload>(response);
    if (!response.ok || !payload.isSuccess) {
      throw new ApiError(
        payload.message || 'The profile image could not be uploaded.',
        payload.code,
      );
    }
    return payload.data;
  },
};

async function sendProfileImage(image: LocalProfileImage, retry = true): Promise<User> {
  if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
    throw new ApiError('The profile picture must be 5 MB or smaller.', 413);
  }
  const form = new FormData();
  if (Platform.OS === 'web') {
    const imageResponse = await fetch(image.uri);
    form.append('file', await imageResponse.blob(), image.fileName);
  } else {
    form.append('file', {
      uri: image.uri,
      name: image.fileName,
      type: image.mimeType,
    } as unknown as Blob);
  }
  const tokens = await getSessionTokens();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/profile/picture`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: form,
    });
  } catch {
    throw connectionError('upload the profile picture');
  }
  if (response.status === 401 && retry && (await refreshAccessToken()))
    return sendProfileImage(image, false);
  const payload = await readPayload<User>(response);
  if (!response.ok || !payload.isSuccess)
    throw new ApiError(
      payload.message || 'The profile picture could not be updated.',
      payload.code,
    );
  return payload.data;
}

export const profileApi = {
  update(body: UpdateProfilePayload) {
    return apiRequest<User>('/profile', { method: 'PATCH', body, authenticated: true });
  },
  replacePicture(image: LocalProfileImage) {
    return sendProfileImage(image);
  },
  removePicture() {
    return apiRequest<User>('/profile/picture', { method: 'DELETE', authenticated: true });
  },
};

export const discoveryApi = {
  workers() {
    return apiRequest<WorkerSummary[]>('/discovery/recommended-workers', { authenticated: true });
  },
  tasks() {
    return apiRequest<TaskSummary[]>('/discovery/recommended-tasks', { authenticated: true });
  },
};

export const supportApi = {
  options() {
    return apiRequest<SupportOptions>('/support/options', { authenticated: true });
  },
  contact(subject: string, message: string) {
    return apiRequest<null>('/support/contact', {
      method: 'POST',
      body: { subject, message },
      authenticated: true,
    });
  },
};
