export type KycStatus =
  'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'APPEALING' | 'SUSPENDED';

export type KycSession = {
  appId: string;
  publicKey: string;
  widgetId: string;
  referenceId: string;
  environment: string;
  widgetType: string;
};

export type KycStatusResult = {
  verificationId: string | null;
  referenceId: string | null;
  status: KycStatus;
  providerStatus: string | null;
  idType: string | null;
  maskedIdValue: string | null;
  livenessScore: number | null;
  imageMatchScore: number | null;
  failureReason: string | null;
  appealReason: string | null;
  environment: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  reviewedAt: string | null;
};

export type DojahLaunchResult = 'approved' | 'pending' | 'failed' | 'closed' | 'unknown';
