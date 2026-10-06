import { apiRequest } from '@/src/lib/api';

export type PayoutBank = { code: string; name: string };
export type PayoutAccount = {
  bankName: string;
  accountName: string;
  maskedAccountNumber: string;
};

export const payoutAccountApi = {
  banks() {
    return apiRequest<PayoutBank[]>('/wallet/banks', { authenticated: true, timeoutMs: 30_000 });
  },
  current() {
    return apiRequest<PayoutAccount | null>('/wallet/bank-account', { authenticated: true });
  },
  resolve(bankCode: string, accountNumber: string) {
    return apiRequest<PayoutAccount>('/wallet/bank-account/resolve', {
      method: 'POST',
      authenticated: true,
      timeoutMs: 30_000,
      body: { bankCode, accountNumber },
    });
  },
  confirm(bankCode: string, accountNumber: string, confirmedAccountName: string) {
    return apiRequest<PayoutAccount>('/wallet/bank-account', {
      method: 'PUT',
      authenticated: true,
      timeoutMs: 45_000,
      body: { account: { bankCode, accountNumber }, confirmedAccountName },
    });
  },
};
