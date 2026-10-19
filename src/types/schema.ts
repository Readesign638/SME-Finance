import type { Timestamp } from 'firebase/firestore';

export type PaymentMethod = 'M-Pesa' | 'EcoCash' | 'Cash' | 'Card';
export type TransactionStatus = 'Completed' | 'Pending' | 'Failed';

export interface Transaction {
  id: string;
  name: string;
  items?: string;
  amount: number;
  method: PaymentMethod;
  status: TransactionStatus;
  date: string;
  time: string;
  userId?: string;
  createdAt?: Timestamp | null;

  // --- Debt-specific fields (only populated when status === 'Pending') ---
  /** Customer's phone number — required for any pending (Sekoloto) record. */
  customerPhone?: string;
  /** Customer's email — optional, used for email reminders. */
  customerEmail?: string;
  /** ISO date (YYYY-MM-DD) by which the debt should be settled. */
  dueDate?: string;
  /** Cumulative amount already paid toward this debt (supports partial payments). */
  amountPaid?: number;
  /** How many reminders have been sent for this debt. */
  remindersSent?: number;
  /** ISO timestamp of the last reminder. */
  lastReminderAt?: string;
  /** Free-text note, e.g. "promised to pay on Friday". */
  notes?: string;
}

export interface BusinessStats {
  totalRevenue: number;
  mpesaVolume: number;
  ecocashVolume: number;
  totalPending: number;
  revenueChange: string;
}