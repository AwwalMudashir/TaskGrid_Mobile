import type { LocalProfileImage } from '@/src/features/auth/types';
import { apiRequest, uploadAuthenticatedImage } from '@/src/lib/api';

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
  runnerCompletedAt: string | null;
  completionReviewDeadlineAt: string | null;
  disputeStatus: DisputeStatus | null;
  review: TaskReview | null;
  myReview: TaskReview | null;
};

export type ReceivedReviewPage = {
  averageRating: number;
  reviewCount: number;
  items: TaskReview[];
  page: number;
  hasNext: boolean;
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
};

type TaskPage = { items: TaskCard[]; page: number; hasNext: boolean };
export type MineTaskView = 'CURRENT' | 'PREVIOUS';
type TaskPayment = {
  taskId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl: string | null;
};
export type EmergencyContact = { name: string; phoneNumber: string };

export const taskApi = {
  mine(page = 0, view: MineTaskView = 'CURRENT') {
    return apiRequest<TaskPage>(`/tasks/mine?page=${page}&view=${view}`, {
      authenticated: true,
    });
  },
  open(page = 0, coordinates?: Coordinates, radiusKm = 15, zoneOnly = false) {
    const locationQuery = coordinates
      ? `&latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radiusKm=${radiusKm}&zoneOnly=${zoneOnly}`
      : '';
    return apiRequest<TaskPage>(`/tasks/open?page=${page}${locationQuery}`, {
      authenticated: true,
    });
  },
  updateDiscoveryLocation(coordinates: Coordinates) {
    return apiRequest<WorkerLocation>('/locations/me', {
      method: 'PUT',
      body: coordinates,
      authenticated: true,
    });
  },
  detail(id: string) {
    return apiRequest<TaskDetail>(`/tasks/${id}`, { authenticated: true });
  },
  post(body: CreateTask) {
    return apiRequest<TaskDetail>('/tasks', {
      method: 'POST',
      body,
      authenticated: true,
    });
  },
  apply(id: string, proposedPrice: number, etaMinutes: number, message: string) {
    return apiRequest<TaskDetail>(`/tasks/${id}/bids`, {
      method: 'POST',
      body: { proposedPrice, etaMinutes, message },
      authenticated: true,
    });
  },
  accept(id: string, bidId: string) {
    return apiRequest<TaskDetail>(`/tasks/${id}/bids/${bidId}/accept`, {
      method: 'POST',
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
  receivedReviews(page = 0) {
    return apiRequest<ReceivedReviewPage>(`/reviews/me?page=${page}`, {
      authenticated: true,
    });
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
