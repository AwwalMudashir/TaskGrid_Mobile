import type { LocalProfileImage } from '@/src/features/auth/types';
import { apiRequest, cachedApiRequest, uploadAuthenticatedImage } from '@/src/lib/api';

export type TaskStatus =
  | 'POSTED'
  | 'BID_RECEIVED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'PAID'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'CANCELLED';
export type PaymentStatus =
  | 'INITIALIZED'
  | 'HELD'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RELEASED'
  | 'PARTIALLY_RELEASED'
  | 'REFUNDED'
  | 'REFUND_PENDING'
  | 'DISPUTED'
  | 'PROCESSING'
  | 'FAILED'
  | 'CANCELLED';

export type TaskCard = {
  id: string;
  title: string;
  category: string;
  locationDescription: string;
  budget: number | null;
  acceptedPrice: number | null;
  status: TaskStatus;
  paymentStatus: PaymentStatus | null;
  scheduledStartAt: string | null;
  createdAt: string;
  clientFirstName: string | null;
  assignedRunnerFirstName: string | null;
  assignedToViewer: boolean;
  mapLatitude: number | null;
  mapLongitude: number | null;
  distanceKm: number | null;
  estimatedTravelMinutes: number | null;
  zoneId: string | null;
  zoneName: string | null;
};

export type TaskBid = {
  id: string;
  runnerId: string;
  runnerName: string;
  runnerPictureUrl: string | null;
  proposedPrice: number;
  etaMinutes: number;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  createdAt: string;
  averageRating: number | null;
  reviewCount: number;
  totalJobs: number;
  identityVerified: boolean;
  completionRate: number | null;
  primarySkill: string | null;
  skills: string[];
  approximateLocation: string | null;
  approximateLatitude: number | null;
  approximateLongitude: number | null;
  approximateDistanceKm: number | null;
  locationUpdatedAt: string | null;
  recentReviews: WorkerReview[];
  priceAdjustmentReason: string | null;
  matchesPostedPrice: boolean;
};

export type WorkerReview = {
  reviewerFirstName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type TaskReview = {
  id: string;
  taskId: string;
  taskTitle: string;
  reviewerId: string;
  reviewerFirstName: string;
  revieweeId: string;
  revieweeName: string;
  rating: number;
  comment: string | null;
  moderationStatus: 'CLEAR' | 'FLAGGED' | 'UNDER_REVIEW' | 'APPROVED' | 'REMOVED';
  reportReason: string | null;
  createdAt: string;
  moderatedAt: string | null;
};

export type TaskImage = {
  id: string;
  url: string;
  type: 'BRIEF' | 'COMPLETION';
  createdAt: string;
};

export type TaskDetail = TaskCard & {
  description: string;
  latitude: number | null;
  longitude: number | null;
  exactLocationVisible: boolean;
  urgencyLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';
  clientId: string;
  clientName: string;
  assignedRunnerId: string | null;
  assignedRunnerName: string | null;
  bids: TaskBid[];
  briefImages: TaskImage[];
  completionImages: TaskImage[];
  enRouteAt: string | null;
  arrivedAt: string | null;
  arrivalDistanceMetres: number | null;
  arrivalVerificationMethod: 'GPS' | 'MANUAL' | null;
  manualArrivalReason: string | null;
  locationSharingEnabled: boolean;
  runnerLatitude: number | null;
  runnerLongitude: number | null;
  runnerLocationUpdatedAt: string | null;
  runnerDistanceToTaskMetres: number | null;
  runnerEstimatedTravelMinutes: number | null;
  runnerCompletedAt: string | null;
  completionReviewDeadlineAt: string | null;
  disputeStatus: DisputeStatus | null;
  review: TaskReview | null;
  myReview: TaskReview | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  priceExplanation: string | null;
  maximumPriceAdjustmentPercent: number;
  minimumApplicationPrice: number;
  maximumApplicationPrice: number;
};

export type ReceivedReviewPage = {
  averageRating: number;
  reviewCount: number;
  items: TaskReview[];
  page: number;
  hasNext: boolean;
};

export type WorkerReviewPage = {
  content: TaskReview[];
  number: number;
  last: boolean;
  totalElements: number;
};

export type DisputeStatus =
  | 'OPEN'
  | 'GATHERING_EVIDENCE'
  | 'AI_REVIEW'
  | 'AWAITING_PARTY_RESPONSE'
  | 'RESOLUTION_PENDING'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type DisputeOutcome =
  'FULL_RELEASE_TO_RUNNER' | 'FULL_REFUND_TO_CLIENT' | 'SPLIT_PAYMENT' | 'MANUAL_REVIEW';

export type TaskDispute = {
  id: string;
  taskId: string;
  taskTitle: string;
  transactionId: string;
  status: DisputeStatus;
  reasonCode: string;
  clientStatement: string | null;
  runnerStatement: string | null;
  clientEvidenceUrls: string[];
  runnerEvidenceUrls: string[];
  briefImages: TaskImage[];
  completionImages: TaskImage[];
  paymentAmount: number;
  workerReleaseAmount: number | null;
  clientRefundAmount: number | null;
  finalOutcome: DisputeOutcome | null;
  resolutionNote: string | null;
  raisedById: string;
  raisedByName: string;
  resolvedByName: string | null;
  taskStatus: TaskStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  resolvedAt: string | null;
  history: DisputeHistory[];
};

export type DisputeHistory = {
  id: string;
  status: DisputeStatus;
  eventType:
    | 'OPENED'
    | 'PARTY_RESPONSE_ADDED'
    | 'EVIDENCE_ADDED'
    | 'CLOSED_BY_RAISER'
    | 'RESOLUTION_STARTED'
    | 'RESOLVED'
    | 'REFUND_FAILED';
  actorName: string;
  note: string | null;
  workerReleaseAmount: number | null;
  clientRefundAmount: number | null;
  createdAt: string;
};

export type Coordinates = { latitude: number; longitude: number };
export type WorkerLocation = Coordinates & {
  taskId: string | null;
  recordedAt: string;
  distanceToTaskMetres: number | null;
  sharing: boolean;
  taskStatus: TaskStatus | null;
};

export type CreateTask = {
  title: string;
  description: string;
  skillId: string;
  locationDescription: string;
  latitude: number;
  longitude: number;
  budget: number;
  urgencyLevel: 'LOW' | 'NORMAL' | 'HIGH';
  assistantAuditId?: string;
};

export type TaskAssistantDraft = {
  auditId: string;
  title: string | null;
  description: string | null;
  skillId: string | null;
  category: string | null;
  locationDescription: string | null;
  budget: number;
  urgencyLevel: 'LOW' | 'NORMAL' | 'HIGH';
  suggestedPriceMin: number;
  suggestedPriceMax: number;
  priceExplanation: string;
  missingFields: string[];
  followUpQuestions: string[];
  safetyReviewSuggested: boolean;
  safetySignals: string[];
  extractionSource: 'AI' | 'LOCAL_FALLBACK';
};

export type TaskPriceSuggestion = {
  minimum: number;
  maximum: number;
  midpoint: number;
  explanation: string;
  historicalSampleSize: number;
};

type TaskPage = { items: TaskCard[]; page: number; hasNext: boolean };
export type MineTaskView = 'CURRENT' | 'PREVIOUS';
export type PreviousTaskDateRange = {
  fromDate?: string;
  toDate?: string;
};
type TaskPayment = {
  taskId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl: string | null;
};
export type EmergencyContact = { name: string; phoneNumber: string };

export type LifecycleReminderAction = 'STILL_WORKING' | 'KEEP_WAITING' | 'OPEN_DISPUTE';

export type LifecycleReminder = {
  id: string;
  taskId: string;
  type: 'ARRIVAL_PROGRESS' | 'JOURNEY_DELAY';
  state: 'PENDING' | 'RESPONDED' | 'EXPIRED';
  selectedAction: LifecycleReminderAction | null;
  actionable: boolean;
  responseRecorded: boolean;
  positiveActionLabel: string;
  message: string;
  sentAt: string;
  respondedAt: string | null;
};

export type TaskCancellationReason =
  'NO_LONGER_NEEDED' | 'PLANS_CHANGED' | 'DUPLICATE_TASK' | 'WORKER_DELAYED' | 'OTHER';

export type TaskCancellation = {
  id: string;
  taskId: string;
  quoteId: string;
  status: 'QUOTED' | 'REFUND_PENDING' | 'COMPLETED' | 'REFUND_FAILED';
  stage: 'OPEN_TASK' | 'ACCEPTED_UNPAID' | 'PAID_BEFORE_JOURNEY' | 'EN_ROUTE';
  reasonCode: TaskCancellationReason | null;
  reasonDetails: string | null;
  taskAmount: number;
  workerCompensationAmount: number;
  clientRefundAmount: number;
  workerCompensationPercent: number;
  currency: string;
  explanation: string;
  canConfirm: boolean;
  refundPending: boolean;
  quoteExpiresAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
};

export const taskApi = {
  assistantDraft(body: {
    transcript: string;
    latitude?: number;
    longitude?: number;
    locationDescription?: string;
  }) {
    return apiRequest<TaskAssistantDraft>('/tasks/assistant/draft', {
      method: 'POST',
      body,
      authenticated: true,
    });
  },
  assistantDecision(auditId: string, accepted: boolean) {
    return apiRequest<void>(`/tasks/assistant/${auditId}/decision`, {
      method: 'POST',
      body: { accepted },
      authenticated: true,
    });
  },
  priceSuggestion(body: {
    skillId: string;
    description: string;
    urgencyLevel: 'LOW' | 'NORMAL' | 'HIGH';
    latitude?: number;
    longitude?: number;
  }) {
    return apiRequest<TaskPriceSuggestion>('/tasks/assistant/price', {
      method: 'POST',
      body,
      authenticated: true,
    });
  },
  mine(
    page = 0,
    view: MineTaskView = 'CURRENT',
    forceRefresh = false,
    dateRange?: PreviousTaskDateRange,
  ) {
    const dates =
      view === 'PREVIOUS'
        ? `${dateRange?.fromDate ? `&fromDate=${dateRange.fromDate}` : ''}${dateRange?.toDate ? `&toDate=${dateRange.toDate}` : ''}`
        : '';
    const size = view === 'PREVIOUS' ? '&size=5' : '';
    const path = `/tasks/mine?page=${page}&view=${view}${size}${dates}`;
    return cachedApiRequest<TaskPage>(
      path,
      {
        ttlMs: view === 'CURRENT' ? 10 * 1_000 : 2 * 60 * 1_000,
        forceRefresh,
      },
      { authenticated: true },
    );
  },
  open(page = 0, coordinates?: Coordinates, radiusKm = 15, zoneOnly = false, forceRefresh = false) {
    const normalized = coordinates
      ? {
          latitude: Number(coordinates.latitude.toFixed(4)),
          longitude: Number(coordinates.longitude.toFixed(4)),
        }
      : undefined;
    const locationQuery = normalized
      ? `&latitude=${normalized.latitude}&longitude=${normalized.longitude}&radiusKm=${radiusKm}&zoneOnly=${zoneOnly}`
      : '';
    const path = `/tasks/open?page=${page}${locationQuery}`;
    return cachedApiRequest<TaskPage>(
      path,
      {
        ttlMs: 60 * 1_000,
        forceRefresh,
      },
      { authenticated: true },
    );
  },
  updateDiscoveryLocation(coordinates: Coordinates) {
    return apiRequest<WorkerLocation>('/locations/me', {
      method: 'PUT',
      body: coordinates,
      authenticated: true,
    });
  },
  detail(id: string, forceRefresh = false) {
    return cachedApiRequest<TaskDetail>(
      `/tasks/${id}`,
      {
        ttlMs: (task) =>
          ['PAID', 'REFUNDED', 'CANCELLED'].includes(task.status) ? 5 * 60 * 1_000 : 5 * 1_000,
        forceRefresh,
      },
      { authenticated: true },
    );
  },
  post(body: CreateTask) {
    return apiRequest<TaskDetail>('/tasks', {
      method: 'POST',
      body,
      authenticated: true,
    });
  },
  apply(
    id: string,
    proposedPrice: number,
    coordinates: Coordinates,
    message: string,
    priceAdjustmentReason: string,
  ) {
    return apiRequest<TaskDetail>(`/tasks/${id}/bids`, {
      method: 'POST',
      body: {
        proposedPrice,
        ...coordinates,
        message,
        priceAdjustmentReason: priceAdjustmentReason.trim() || null,
      },
      authenticated: true,
    });
  },
  accept(id: string, bidId: string) {
    return apiRequest<TaskDetail>(`/tasks/${id}/bids/${bidId}/accept`, {
      method: 'POST',
      authenticated: true,
    });
  },
  cancellationQuote(id: string) {
    return apiRequest<TaskCancellation>(`/tasks/${id}/cancellation-quote`, {
      method: 'POST',
      authenticated: true,
    });
  },
  cancel(id: string, quoteId: string, reasonCode: TaskCancellationReason, details: string) {
    return apiRequest<TaskCancellation>(`/tasks/${id}/cancel`, {
      method: 'POST',
      body: { quoteId, reasonCode, details: details.trim() || null },
      authenticated: true,
    });
  },
  cancellation(id: string) {
    return apiRequest<TaskCancellation>(`/tasks/${id}/cancellation`, {
      authenticated: true,
    });
  },
  initializePayment(id: string) {
    return apiRequest<TaskPayment>(`/payments/tasks/${id}/initialize`, {
      method: 'POST',
      authenticated: true,
      timeoutMs: 30_000,
    });
  },
  complete(id: string) {
    return apiRequest<TaskPayment>(`/payments/tasks/${id}/complete`, {
      method: 'POST',
      authenticated: true,
    });
  },
  confirm(id: string) {
    return apiRequest<TaskPayment>(`/payments/tasks/${id}/confirm`, {
      method: 'POST',
      authenticated: true,
    });
  },
  review(id: string, rating: number, comment: string) {
    return apiRequest<TaskReview>(`/tasks/${id}/review`, {
      method: 'POST',
      body: { rating, comment: comment.trim() || null },
      authenticated: true,
    });
  },
  reportReview(reviewId: string, reason: string) {
    return apiRequest<TaskReview>(`/reviews/${reviewId}/report`, {
      method: 'POST',
      body: { reason: reason.trim() },
      authenticated: true,
    });
  },
  receivedReviews(page = 0, forceRefresh = false) {
    const path = `/reviews/me?page=${page}`;
    return cachedApiRequest<ReceivedReviewPage>(
      path,
      {
        ttlMs: 2 * 60 * 1_000,
        forceRefresh,
      },
      { authenticated: true },
    );
  },
  workerReviews(workerId: string, page = 0, forceRefresh = false) {
    const path = `/workers/${workerId}/reviews?page=${page}&size=20`;
    return cachedApiRequest<WorkerReviewPage>(
      path,
      { ttlMs: 5 * 60 * 1_000, forceRefresh },
      { authenticated: true },
    );
  },
  openDispute(id: string, reasonCode: string, statement: string) {
    return apiRequest<TaskDispute>(`/tasks/${id}/dispute`, {
      method: 'POST',
      body: { reasonCode, statement, evidenceUrls: [] },
      authenticated: true,
    });
  },
  dispute(id: string) {
    return apiRequest<TaskDispute>(`/tasks/${id}/dispute`, {
      authenticated: true,
    });
  },
  respondToDispute(id: string, statement: string) {
    return apiRequest<TaskDispute>(`/tasks/${id}/dispute/response`, {
      method: 'POST',
      body: { statement },
      authenticated: true,
    });
  },
  closeDispute(id: string) {
    return apiRequest<TaskDispute>(`/tasks/${id}/dispute/close`, {
      method: 'POST',
      authenticated: true,
    });
  },
  uploadDisputeEvidence(id: string, image: LocalProfileImage) {
    return uploadAuthenticatedImage<TaskDispute>(`/tasks/${id}/dispute/evidence`, image);
  },
  uploadBriefImage(id: string, image: LocalProfileImage) {
    return uploadAuthenticatedImage<TaskImage>(`/tasks/${id}/images/brief`, image);
  },
  uploadCompletionImage(id: string, image: LocalProfileImage) {
    return uploadAuthenticatedImage<TaskImage>(`/tasks/${id}/images/completion`, image);
  },
  startJourney(id: string, coordinates: Coordinates) {
    return apiRequest<WorkerLocation>(`/locations/tasks/${id}/en-route`, {
      method: 'POST',
      body: coordinates,
      authenticated: true,
    });
  },
  updateJourney(id: string, coordinates: Coordinates) {
    return apiRequest<WorkerLocation>(`/locations/tasks/${id}`, {
      method: 'PUT',
      body: coordinates,
      authenticated: true,
    });
  },
  arrive(id: string, coordinates: Coordinates) {
    return apiRequest<WorkerLocation>(`/locations/tasks/${id}/arrive`, {
      method: 'POST',
      body: coordinates,
      authenticated: true,
    });
  },
  arriveManually(id: string, reason: string) {
    return apiRequest<WorkerLocation>(`/locations/tasks/${id}/arrive-manually`, {
      method: 'POST',
      body: { reason: reason.trim() },
      authenticated: true,
    });
  },
  activeJourney() {
    return apiRequest<WorkerLocation | null>('/locations/active-journey', {
      authenticated: true,
    });
  },
  stopSharing(id: string) {
    return apiRequest<WorkerLocation>(`/locations/tasks/${id}/stop-sharing`, {
      method: 'POST',
      authenticated: true,
    });
  },
  lifecycleReminder(id: string, reminderId: string) {
    return apiRequest<LifecycleReminder>(`/tasks/${id}/reminders/${reminderId}`, {
      authenticated: true,
    });
  },
  respondToLifecycleReminder(id: string, reminderId: string, action: LifecycleReminderAction) {
    return apiRequest<LifecycleReminder>(`/tasks/${id}/reminders/${reminderId}/respond`, {
      method: 'POST',
      body: { action },
      authenticated: true,
    });
  },
};

export const emergencyContactApi = {
  current() {
    return apiRequest<EmergencyContact | null>('/profile/emergency-contact', {
      authenticated: true,
    });
  },
  save(name: string, phoneNumber: string) {
    return apiRequest<EmergencyContact>('/profile/emergency-contact', {
      method: 'PUT',
      body: { name, phoneNumber },
      authenticated: true,
    });
  },
};
