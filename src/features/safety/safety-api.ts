import { apiRequest } from '@/src/lib/api';

export type SosResult = {
  alertId: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  contactName: string;
  contactPhone: string;
  smsDeliveredToProvider: boolean;
  message: string;
  createdAt: string;
};

export const safetyApi = {
  sendSos(input: { taskId?: string; latitude?: number; longitude?: number; message?: string }) {
    return apiRequest<SosResult>('/safety/sos', {
      method: 'POST',
      body: input,
      authenticated: true,
    });
  },
};
