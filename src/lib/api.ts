import { File, UploadType } from 'expo-file-system';
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
import type { KycSession, KycStatusResult } from '@/src/features/kyc/types';
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
  timeoutMs?: number;
};

const localApiUrl = Platform.select({
  android: 'http://10.0.2.2:8080/api/v1',
  default: 'http://localhost:8080/api/v1',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? localApiUrl;

const API_REQUEST_TIMEOUT_MS = 10_000;
const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;

const CONNECTION_ERROR_MESSAGE = "We couldn't connect right now. Please try again.";
const TIMEOUT_ERROR_MESSAGE = 'This is taking longer than expected. Please try again in a moment.';
const RESPONSE_ERROR_MESSAGE = "We couldn't complete that request. Please try again.";
const PHOTO_UPLOAD_ERROR_MESSAGE =
  "We couldn't upload that photo. Check your connection and try again.";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function connectionError() {
  return new ApiError(CONNECTION_ERROR_MESSAGE, 0);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = API_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (cause) {
    if (timedOut) {
      throw new ApiError(TIMEOUT_ERROR_MESSAGE, 408);
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

async function readPayload<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(RESPONSE_ERROR_MESSAGE, response.status);
  }
}

function readTextPayload<T>(body: string, status: number): ApiResponse<T> {
  try {
    return JSON.parse(body) as ApiResponse<T>;
  } catch {
    throw new ApiError(RESPONSE_ERROR_MESSAGE, status);
  }
}

type ImageUploadResult<T> = {
  status: number;
  ok: boolean;
  payload: ApiResponse<T>;
};

async function uploadImageRequest<T>(
  path: string,
  method: 'POST' | 'PUT',
  image: LocalProfileImage,
  headers: Record<string, string> = {},
): Promise<ImageUploadResult<T>> {
  try {
    if (Platform.OS === 'web') {
      const form = new FormData();
      const imageResponse = await fetch(image.uri);
      form.append('file', await imageResponse.blob(), image.fileName);
      const response = await fetchWithTimeout(
        `${API_BASE_URL}${path}`,
        {
          method,
          headers: { Accept: 'application/json', ...headers },
          body: form,
        },
        IMAGE_UPLOAD_TIMEOUT_MS,
      );
      return {
        status: response.status,
        ok: response.ok,
        payload: await readPayload<T>(response),
      };
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, IMAGE_UPLOAD_TIMEOUT_MS);

    try {
      const result = await new File(image.uri).upload(`${API_BASE_URL}${path}`, {
        httpMethod: method,
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: image.mimeType,
        headers: { Accept: 'application/json', ...headers },
        signal: controller.signal,
      });
      return {
        status: result.status,
        ok: result.status >= 200 && result.status < 300,
        payload: readTextPayload<T>(result.body, result.status),
      };
    } catch (cause) {
      if (timedOut) throw new ApiError(TIMEOUT_ERROR_MESSAGE, 408);
      throw cause;
    } finally {
      clearTimeout(timeout);
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw new ApiError(PHOTO_UPLOAD_ERROR_MESSAGE, 0);
  }
}

async function refreshAccessToken() {
  const current = await getSessionTokens();
  if (!current?.refreshToken) return false;

  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh-token`, {
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
    timeoutMs = API_REQUEST_TIMEOUT_MS,
    headers,
    ...requestOptions
  } = options;
  const tokens = authenticated ? await getSessionTokens() : null;
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      {
        ...requestOptions,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...headers,
          ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      timeoutMs,
    );
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw connectionError();
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
    const result = await uploadImageRequest<ProfileImageUpload>(
      '/media/profile-image',
      'POST',
      image,
    );
    if (!result.ok || !result.payload.isSuccess) {
      throw new ApiError(
        result.payload.message || 'The profile image could not be uploaded.',
        result.payload.code,
      );
    }
    return result.payload.data;
  },
};

export async function uploadAuthenticatedImage<T>(
  path: string,
  image: LocalProfileImage,
  retry = true,
): Promise<T> {
  const tokens = await getSessionTokens();
  const result = await uploadImageRequest<T>(path, 'POST', image, {
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  });
  if (result.status === 401 && retry && (await refreshAccessToken()))
    return uploadAuthenticatedImage<T>(path, image, false);
  if (!result.ok || !result.payload.isSuccess)
    throw new ApiError(
      result.payload.message || 'The image could not be uploaded.',
      result.payload.code,
    );
  return result.payload.data;
}

async function sendProfileImage(image: LocalProfileImage, retry = true): Promise<User> {
  if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
    throw new ApiError('The profile picture must be 5 MB or smaller.', 413);
  }
  const tokens = await getSessionTokens();
  const result = await uploadImageRequest<User>('/profile/picture', 'PUT', image, {
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  });
  if (result.status === 401 && retry && (await refreshAccessToken()))
    return sendProfileImage(image, false);
  if (!result.ok || !result.payload.isSuccess)
    throw new ApiError(
      result.payload.message || 'The profile picture could not be updated.',
      result.payload.code,
    );
  return result.payload.data;
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

export const kycApi = {
  startSession() {
    return apiRequest<KycSession>('/kyc/session', {
      method: 'POST',
      authenticated: true,
    });
  },
  status() {
    return apiRequest<KycStatusResult>('/kyc/status', { authenticated: true });
  },
  sync() {
    return apiRequest<KycStatusResult>('/kyc/sync', {
      method: 'POST',
      authenticated: true,
    });
  },
  appeal(reason: string) {
    return apiRequest<KycStatusResult>('/kyc/appeal', {
      method: 'POST',
      body: { reason },
      authenticated: true,
    });
  },
};
