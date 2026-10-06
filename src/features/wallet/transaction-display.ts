import type { WalletTransaction } from '@/src/features/wallet/wallet-api';

export function formatMoney(amount: number, currency = 'NGN') {
  return `${currency === 'NGN' ? '₦' : `${currency} `}${Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function transactionStatus(status: string) {
  const labels: Record<string, string> = {
    INITIALIZED: 'Awaiting client payment',
    HELD: 'Payment held',
    IN_PROGRESS: 'Task in progress',
    COMPLETED: 'Awaiting client confirmation',
    RELEASED: 'Successful',
    PROCESSING: 'Processing',
    FAILED: 'Failed',
    DISPUTED: 'Under review',
    REFUNDED: 'Refunded',
    CANCELLED: 'Cancelled',
  };
  return labels[status] ?? status.toLowerCase().replace(/_/g, ' ');
}

export function transactionTitle(item: WalletTransaction) {
  if (item.type === 'WITHDRAWAL') return 'Bank withdrawal';
  if (item.status === 'INITIALIZED') return 'Task payment started';
  return 'Task earnings';
}
