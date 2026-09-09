export type AccountType = 'CLIENT' | 'WORKER';
export type UserRole = 'CLIENT' | 'RUNNER' | 'ADMIN';

export type User = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  profilePictureUrl: string | null;
  primarySkillId: string | null;
  primarySkillName: string | null;
  emailVerified: boolean;
  active: boolean;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export type TokenResponse = SessionTokens & {
  tokenType: string;
  expiresInSeconds: number;
  user: User;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  primarySkillId?: string;
  profilePictureUrl?: string;
  profilePicturePublicId?: string;
};

export type RegistrationDraft = RegisterPayload & {
  accountType: AccountType;
  primarySkillId: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type Skill = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconName: string | null;
  displayOrder: number;
  active: boolean;
};

export type LocalProfileImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
};

export type ProfileImageUpload = {
  url: string;
  publicId: string;
};

export type UpdateProfilePayload = {
  fullName: string;
  phoneNumber: string;
  primarySkillId?: string;
};

export type WorkerSummary = {
  id: string;
  fullName: string;
  profilePictureUrl: string | null;
  primarySkillName: string | null;
  averageRating: number | null;
  totalJobs: number;
};

export type TaskSummary = {
  id: string;
  title: string;
  category: string;
  locationDescription: string;
  budget: number | null;
  scheduledStartAt: string | null;
  urgencyLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';
};

export type SupportOptions = { email: string; phoneNumber: string | null };
