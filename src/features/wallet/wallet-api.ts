import * as SecureStore from 'expo-secure-store';

import { apiRequest } from '@/src/lib/api';

export type TransactionStatus =
  | 'INITIALIZED'
  | 'HELD'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'PROCESSING'
  | 'FAILED'
  | 'CANCELLED';

export type WalletSummary = {
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
};

export type WalletTransaction = {
  id: string;
  taskId: string | null;
  type: 'ESCROW' | 'WITHDRAWAL' | 'REFERRAL_PAYOUT' | 'MICRO_TASK_PAYOUT';
  status: TransactionStatus;
  amount: number;
  currency: string;
  failureReason: string | null;
  createdAt: string;
};

export type Withdrawal = {
  id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  failureReason: string | null;
};

export type WithdrawalIntent = {
  amount: number;
  key: string;
  createdAt: number;
  reminderShown: boolean;
};
function pendingWithdrawalKey(userId: string) {
  return `taskgrid.pendingWithdrawal.${userId}`;
}

function newRequestKey() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (part) => {
    const digit = Math.floor(Math.random() * 16);
    return (part === 'x' ? digit : (digit & 3) | 8).toString(16);
  });
}

export const withdrawalIntent = {
  async load(userId: string): Promise<WithdrawalIntent | null> {
    const saved = await SecureStore.getItemAsync(pendingWithdrawalKey(userId));
    if (!saved) return null;
    try {
      const value = JSON.parse(saved) as WithdrawalIntent;
      const valid =
        Number.isFinite(value.amount) &&
        value.amount > 0 &&
        Number.isFinite(value.createdAt) &&
        typeof value.reminderShown === 'boolean' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.key);
      if (valid) return value;
    } catch {
      // Invalid and legacy values are removed below.
    }
    await SecureStore.deleteItemAsync(pendingWithdrawalKey(userId)).catch(() => undefined);
    return null;
  },
  async create(userId: string, amount: number): Promise<WithdrawalIntent> {
    const existing = await this.load(userId);
    if (existing) return existing;
    const intent: WithdrawalIntent = {
      amount,
      key: newRequestKey(),
      createdAt: Date.now(),
      reminderShown: false,
    };
    await SecureStore.setItemAsync(pendingWithdrawalKey(userId), JSON.stringify(intent));
    return intent;
  },
  async markReminderShown(userId: string): Promise<boolean> {
    const intent = await this.load(userId);
    if (!intent || intent.reminderShown) return false;
    await SecureStore.setItemAsync(
      pendingWithdrawalKey(userId),
      JSON.stringify({ ...intent, reminderShown: true }),
    );
    return true;
  },
  clear(userId: string) {
    return SecureStore.deleteItemAsync(pendingWithdrawalKey(userId));
  },
};

export const walletApi = {
  summary: () => apiRequest<WalletSummary>('/wallet', { authenticated: true }),
  transactions: () =>
    apiRequest<WalletTransaction[]>('/wallet/transactions', { authenticated: true }),
  withdrawal: (id: string) =>
    apiRequest<Withdrawal>(`/wallet/withdrawals/${id}`, { authenticated: true }),
  withdraw: (amount: number, idempotencyKey: string) =>
    apiRequest<Withdrawal>('/wallet/withdrawals', {
      method: 'POST',
      authenticated: true,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: { amount },
      timeoutMs: 30_000,
    }),
};
