import { apiRequest } from '@/src/lib/api';

export type SosResult = {
  alertId: string;
  status: 'PENDING' | 'SUBMITTED' | 'DELIVERED' | 'SENT' | 'FAILED' | 'CANCELLED';
  contactName: string;
  contactPhone: string;
  smsDeliveredToProvider: boolean;
  message: string;
  createdAt: string;
};

export type CancelSosResult = {
  taskId: string;
  status: 'CANCELLED';
  message: string;
};

export const safetyApi = {
  sendSos(input: { taskId?: string; latitude?: number; longitude?: number; message?: string }) {
    return apiRequest<SosResult>('/safety/sos', {
      method: 'POST',
      body: input,
      authenticated: true,
    });
  },
  cancelSos(taskId: string) {
    return apiRequest<CancelSosResult>(`/safety/tasks/${taskId}/sos/cancel`, {
      method: 'POST',
      authenticated: true,
    });
  },
};
