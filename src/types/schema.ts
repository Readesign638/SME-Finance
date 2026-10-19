import type { Timestamp } from 'firebase/firestore';

export type PaymentMethod = 'M-Pesa' | 'EcoCash' | 'Cash' | 'Card';
export type TransactionStatus = 'Completed' | 'Pending' | 'Failed';

export type TransactionType = 'sale' | 'debt' | 'expense';
export type ExpenseCategory = 'Rent' | 'Utilities' | 'Salaries' | 'Transport' | 'Stock' | 'Other';

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

  // --- NEW: distinguishes income from expenses ---
  /** 'sale' | 'debt' | 'expense'. Older records without this field are treated as 'sale' or 'debt' based on status. */
  type?: TransactionType;
  /** Only set when type === 'expense'. One of the fixed expense categories. */
  category?: ExpenseCategory | string;

  // --- Debt-specific fields (only populated when status === 'Pending') ---
  customerPhone?: string;
  customerEmail?: string;
  dueDate?: string;
  amountPaid?: number;
  remindersSent?: number;
  lastReminderAt?: string;
  notes?: string;
}

export interface BusinessStats {
  totalRevenue: number;
  mpesaVolume: number;
  ecocashVolume: number;
  totalPending: number;
  revenueChange: string;
}